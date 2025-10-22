import { Session } from '@shopify/shopify-api';
import type { SessionStorage } from '@shopify/shopify-api';
import { supabaseAdmin } from '../supabase/client';

/**
 * Supabase-backed Session Storage for Shopify API Library
 * 
 * Implements Shopify's SessionStorage interface to store OAuth sessions
 * in Supabase instead of memory/Redis. This allows:
 * - Persistent sessions across server restarts
 * - Automatic token refresh by Shopify library
 * - Works seamlessly with Shopify CLI
 * - Multi-instance support (horizontal scaling)
 * 
 * The Shopify library will call these methods to manage sessions:
 * - storeSession: Called after OAuth, token refresh
 * - loadSession: Called on every authenticated request
 * - deleteSession: Called on logout/uninstall
 * - deleteSessions: Called on shop uninstall (all sessions)
 * - findSessionsByShop: Called to get all sessions for a shop
 */
export class SupabaseSessionStorage implements SessionStorage {
  private readonly tableName = 'shopify_sessions';

  /**
   * Store a session in the database
   * Called by Shopify library after OAuth and token refresh
   */
  async storeSession(session: Session): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] Storing session:', {
          id: session.id,
          shop: session.shop,
          isOnline: session.isOnline,
          expires: session.expires,
        });
      }

      const sessionData = {
        id: session.id,
        shop: session.shop,
        state: session.state,
        is_online: session.isOnline,
        scope: session.scope,
        expires: session.expires ? new Date(session.expires).toISOString() : null,
        access_token: session.accessToken,
        online_access_info: session.onlineAccessInfo ? JSON.stringify(session.onlineAccessInfo) : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from(this.tableName)
        .upsert(sessionData, { onConflict: 'id' });

      if (error) {
        console.error('[SessionStorage] Error storing session:', error);
        return false;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] ✅ Session stored successfully');
      }

      return true;
    } catch (error) {
      console.error('[SessionStorage] Unexpected error storing session:', error);
      return false;
    }
  }

  /**
   * Load a session from the database
   * Called by Shopify library on every authenticated request
   */
  async loadSession(id: string): Promise<Session | undefined> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] Loading session:', id);
      }

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SessionStorage] Session not found:', id);
        }
        return undefined;
      }

      // Check if session is expired
      if (data.expires && new Date(data.expires) < new Date()) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[SessionStorage] Session expired, deleting:', id);
        }
        await this.deleteSession(id);
        return undefined;
      }

      // Convert database record to Session object
      const session = new Session({
        id: data.id,
        shop: data.shop,
        state: data.state,
        isOnline: data.is_online,
        scope: data.scope,
        expires: data.expires ? new Date(data.expires) : undefined,
        accessToken: data.access_token,
        onlineAccessInfo: data.online_access_info ? JSON.parse(data.online_access_info) : undefined,
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] ✅ Session loaded successfully');
      }

      return session;
    } catch (error) {
      console.error('[SessionStorage] Error loading session:', error);
      return undefined;
    }
  }

  /**
   * Delete a session from the database
   * Called by Shopify library on logout
   */
  async deleteSession(id: string): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] Deleting session:', id);
      }

      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) {
        console.error('[SessionStorage] Error deleting session:', error);
        return false;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] ✅ Session deleted successfully');
      }

      return true;
    } catch (error) {
      console.error('[SessionStorage] Unexpected error deleting session:', error);
      return false;
    }
  }

  /**
   * Delete all sessions for a shop
   * Called by Shopify library on app uninstall
   */
  async deleteSessions(ids: string[]): Promise<boolean> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] Deleting multiple sessions:', ids.length);
      }

      const { error } = await supabaseAdmin
        .from(this.tableName)
        .delete()
        .in('id', ids);

      if (error) {
        console.error('[SessionStorage] Error deleting sessions:', error);
        return false;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] ✅ Sessions deleted successfully');
      }

      return true;
    } catch (error) {
      console.error('[SessionStorage] Unexpected error deleting sessions:', error);
      return false;
    }
  }

  /**
   * Find all sessions for a shop
   * Called by Shopify library for shop-specific operations
   */
  async findSessionsByShop(shop: string): Promise<Session[]> {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] Finding sessions for shop:', shop);
      }

      const { data, error } = await supabaseAdmin
        .from(this.tableName)
        .select('*')
        .eq('shop', shop);

      if (error) {
        console.error('[SessionStorage] Error finding sessions:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Convert database records to Session objects
      const sessions = data
        .map((record) => {
          try {
            // Skip expired sessions
            if (record.expires && new Date(record.expires) < new Date()) {
              return null;
            }

            return new Session({
              id: record.id,
              shop: record.shop,
              state: record.state,
              isOnline: record.is_online,
              scope: record.scope,
              expires: record.expires ? new Date(record.expires) : undefined,
              accessToken: record.access_token,
              onlineAccessInfo: record.online_access_info ? JSON.parse(record.online_access_info) : undefined,
            });
          } catch (err) {
            console.error('[SessionStorage] Error parsing session:', err);
            return null;
          }
        })
        .filter((session): session is Session => session !== null);

      if (process.env.NODE_ENV === 'development') {
        console.log('[SessionStorage] ✅ Found', sessions.length, 'sessions for shop');
      }

      return sessions;
    } catch (error) {
      console.error('[SessionStorage] Unexpected error finding sessions:', error);
      return [];
    }
  }
}


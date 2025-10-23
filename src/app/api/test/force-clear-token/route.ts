import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🗑️ FORCE CLEAR TOKEN: Removing invalid token from database...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    console.log(`[${requestId}] 🗑️ Clearing shopify_sessions table for ${targetShop}...`);
    
    // Clear from shopify_sessions table
    const { error: sessionsError, count: sessionsDeleted } = await supabaseAdmin
      .from('shopify_sessions')
      .delete()
      .eq('shop', targetShop);

    console.log(`[${requestId}] shopify_sessions result:`, { error: sessionsError, deleted: sessionsDeleted });

    // Clear from shops table  
    console.log(`[${requestId}] 🗑️ Clearing shops table for ${targetShop}...`);
    const { error: shopsError, count: shopsDeleted } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('shop_domain', targetShop);

    console.log(`[${requestId}] shops result:`, { error: shopsError, deleted: shopsDeleted });

    // Verify both tables are cleared
    console.log(`[${requestId}] 🔍 Verifying tables are cleared...`);
    
    const { data: remainingSessions } = await supabaseAdmin
      .from('shopify_sessions')
      .select('id, shop')
      .eq('shop', targetShop);
      
    const { data: remainingShops } = await supabaseAdmin
      .from('shops')
      .select('id, shop_domain')
      .eq('shop_domain', targetShop);

    const success = !sessionsError && !shopsError;
    const sessionsCleared = !remainingSessions || remainingSessions.length === 0;
    const shopsCleared = !remainingShops || remainingShops.length === 0;

    console.log(`[${requestId}] ✅ Token clearing complete:`, {
      success,
      sessionsCleared,
      shopsCleared,
      remainingSessions: remainingSessions?.length || 0,
      remainingShops: remainingShops?.length || 0
    });

    return NextResponse.json({
      success,
      message: success ? 'Invalid token cleared successfully' : 'Error clearing token',
      details: {
        shopify_sessions: {
          error: sessionsError,
          deleted: sessionsDeleted,
          cleared: sessionsCleared
        },
        shops: {
          error: shopsError,
          deleted: shopsDeleted,
          cleared: shopsCleared
        }
      },
      nextSteps: success ? [
        '1. Go to Shopify admin: https://always-ai-dev-store.myshopify.com/admin',
        '2. Uninstall the app if it exists',
        '3. Reinstall the app from your development URL',
        '4. Test the token: /api/test/check-token'
      ] : [
        'Error occurred while clearing token. Check the error details above.'
      ]
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during force token clearing:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during force token clearing',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

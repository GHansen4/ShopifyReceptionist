import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🔍 CHECKING SESSIONS: Looking for shop sessions...`);

  try {
    // Check all sessions in shopify_sessions table
    const { data: sessions, error } = await supabaseAdmin
      .from('shopify_sessions')
      .select('id, shop, access_token, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`[${requestId}] ❌ Database error:`, error);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: error.message,
        code: error.code
      }, { status: 500 });
    }

    console.log(`[${requestId}] ✅ Found ${sessions?.length || 0} sessions`);

    // Check specifically for always-ai-dev-store.myshopify.com
    const targetShop = 'always-ai-dev-store.myshopify.com';
    const targetSession = sessions?.find(s => s.shop === targetShop);

    return NextResponse.json({
      success: true,
      totalSessions: sessions?.length || 0,
      sessions: sessions || [],
      targetShop,
      targetSessionFound: !!targetSession,
      targetSession: targetSession || null,
      message: targetSession 
        ? `✅ Found session for ${targetShop}` 
        : `❌ No session found for ${targetShop}`
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during session check',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

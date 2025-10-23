import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  console.log(`[${requestId}] 🗑️ CLEAR INVALID TOKEN: Removing invalid token from database...`);

  try {
    const targetShop = 'always-ai-dev-store.myshopify.com';
    
    // Clear from shopify_sessions table
    console.log(`[${requestId}] 🗑️ Clearing shopify_sessions table...`);
    const { error: sessionsError } = await supabaseAdmin
      .from('shopify_sessions')
      .delete()
      .eq('shop', targetShop);

    if (sessionsError) {
      console.error(`[${requestId}] ❌ Error clearing shopify_sessions:`, sessionsError);
    } else {
      console.log(`[${requestId}] ✅ Cleared shopify_sessions table`);
    }

    // Clear from shops table
    console.log(`[${requestId}] 🗑️ Clearing shops table...`);
    const { error: shopsError } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('shop_domain', targetShop);

    if (shopsError) {
      console.error(`[${requestId}] ❌ Error clearing shops:`, shopsError);
    } else {
      console.log(`[${requestId}] ✅ Cleared shops table`);
    }

    return NextResponse.json({
      success: true,
      message: 'Invalid token cleared from database',
      cleared: {
        shopify_sessions: !sessionsError,
        shops: !shopsError
      },
      nextSteps: [
        '1. Go to your Shopify admin: https://always-ai-dev-store.myshopify.com/admin',
        '2. Uninstall the app if it exists',
        '3. Reinstall the app from your development URL',
        '4. Test the token again: /api/test/check-token'
      ]
    });

  } catch (error: any) {
    console.error(`[${requestId}] ❌ Exception during token clearing:`, error);
    return NextResponse.json({
      success: false,
      error: 'Exception during token clearing',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }, { status: 500 });
  }
}

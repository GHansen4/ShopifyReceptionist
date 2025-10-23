import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * Check Vapi assistant configuration and shop mapping
 */
export async function GET() {
  try {
    console.log('[Vapi Assistant Debug] Checking Vapi assistant configuration...');
    
    // Get all shops
    const { data: allShops, error: shopsError } = await supabaseAdmin
      .from('shops')
      .select('shop_domain, vapi_assistant_id, access_token, installed_at')
      .order('installed_at', { ascending: false });
    
    console.log('[Vapi Assistant Debug] All shops:', allShops);
    
    // Check if any shops have vapi_assistant_id
    const shopsWithVapi = allShops?.filter(shop => shop.vapi_assistant_id) || [];
    
    // Check if we have the specific shop we're testing with
    const alwaysAiShop = allShops?.find(shop => 
      shop.shop_domain?.includes('always-ai-dev-store')
    );
    
    return NextResponse.json({
      success: true,
      totalShops: allShops?.length || 0,
      shopsWithVapi: shopsWithVapi.length,
      shopsWithVapiData: shopsWithVapi,
      alwaysAiShop: alwaysAiShop,
      allShops: allShops,
      errors: {
        shopsError: shopsError?.message
      },
      recommendations: {
        needsVapiAssistantId: !alwaysAiShop?.vapi_assistant_id,
        needsReinstall: !alwaysAiShop?.access_token,
        hasValidToken: !!alwaysAiShop?.access_token
      }
    });
    
  } catch (error) {
    console.error('[Vapi Assistant Debug] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

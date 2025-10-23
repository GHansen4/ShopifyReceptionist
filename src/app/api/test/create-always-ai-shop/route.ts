import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('[Create Always AI Shop] Creating always-ai-dev-store.myshopify.com...');
    
    // Create the exact shop that's being requested
    const testShop = {
      shop_domain: 'always-ai-dev-store.myshopify.com',
      shop_name: 'Always AI Dev Store',
      email: 'dev@always-ai.com',
      access_token: 'shpat_test_1234567890abcdef', // Test token
      subscription_status: 'trial',
      plan_name: 'starter',
      call_minutes_used: 0,
      call_minutes_limit: 100,
      installed_at: new Date().toISOString(),
    };
    
    // Insert test shop using admin client (bypasses RLS)
    const { data: shop, error } = await supabaseAdmin
      .from('shops')
      .insert(testShop)
      .select('id, shop_domain, shop_name')
      .single();
    
    if (error) {
      console.error('[Create Always AI Shop] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('[Create Always AI Shop] ✅ Shop created:', shop);
    
    return NextResponse.json({
      success: true,
      shop: shop,
      message: 'Always AI Dev Store created successfully',
      nextSteps: [
        `Shop ID: ${shop.id}`,
        `Domain: ${shop.shop_domain}`,
        'Now you can test the Vapi provision endpoint',
        'The shop-specific endpoint should work with this shop ID'
      ]
    });

  } catch (error) {
    console.error('[Create Always AI Shop] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

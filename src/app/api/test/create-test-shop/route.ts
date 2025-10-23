import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
  try {
    console.log('[Create Test Shop] Creating test shop record...');
    
    // Create a test shop record
    const testShop = {
      shop_domain: 'always-ai-dev-store.myshopify.com',
      shop_name: 'Always AI Dev Store',
      email: 'test@example.com',
      access_token: 'test-access-token-12345',
      subscription_status: 'trial',
      plan_name: 'starter',
      call_minutes_used: 0,
      call_minutes_limit: 100,
      installed_at: new Date().toISOString(),
    };
    
    // Insert test shop
    const { data: shop, error } = await supabase
      .from('shops')
      .insert(testShop)
      .select('id, shop_domain, shop_name')
      .single();
    
    if (error) {
      console.error('[Create Test Shop] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 });
    }
    
    console.log('[Create Test Shop] ✅ Test shop created:', shop);
    
    return NextResponse.json({
      success: true,
      shop: shop,
      message: 'Test shop created successfully',
      nextSteps: [
        `Use shop ID: ${shop.id} to test the shop-specific endpoint`,
        `Test URL: /api/vapi/functions/${shop.id}`,
        'Note: This is a test shop with fake access token'
      ]
    });

  } catch (error) {
    console.error('[Create Test Shop] Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

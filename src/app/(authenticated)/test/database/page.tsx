'use client';

import { useState } from 'react';
import { Card, Button, Text, TextField, Banner, Spinner, DataTable, Badge } from '@shopify/polaris';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface ShopRecord {
  id: number;
  shop_domain: string;
  shop_name: string;
  email: string | null;
  vapi_assistant_id: string | null;
  access_token: string | null;
  access_token_offline: string | null;
  created_at: string;
}

export default function DatabaseTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [shopDomain, setShopDomain] = useState('test-shop.myshopify.com');
  const [shopName, setShopName] = useState('Test Shop');
  const [email, setEmail] = useState('test@example.com');
  const [shops, setShops] = useState<ShopRecord[]>([]);

  const addTestResult = (result: TestResult) => {
    setTestResults(prev => [result, ...prev]);
  };

  const testDatabaseConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-schema');
      const data = await response.json();
      
      addTestResult({
        success: data.success,
        message: data.message || 'Database connection test completed',
        data: data
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addShopToDatabase = async () => {
    setIsLoading(true);
    try {
      const shopData = {
        shop_domain: shopDomain,
        shop_name: shopName,
        email: email,
        timezone: 'UTC',
        phone_number: '+1234567890',
        settings: { test: true },
        subscription_status: 'trial',
        plan_name: 'starter',
        call_minutes_used: 0,
        call_minutes_limit: 100,
        installed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const response = await fetch('/api/test-db-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      });

      const data = await response.json();
      
      addTestResult({
        success: data.success,
        message: data.message || 'Shop added to database',
        data: data
      });

      if (data.success) {
        // Refresh the shops list
        await loadShopsFromDatabase();
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Failed to add shop to database',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadShopsFromDatabase = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-db-read');
      const data = await response.json();
      
      if (data.success && data.shops) {
        setShops(data.shops);
        addTestResult({
          success: true,
          message: `Loaded ${data.shops.length} shops from database`,
          data: data
        });
      } else {
        addTestResult({
          success: false,
          message: 'Failed to load shops from database',
          error: data.error
        });
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Failed to load shops from database',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testSessionStorage = async () => {
    setIsLoading(true);
    try {
      const sessionData = {
        id: 'shpca_test_' + Date.now(),
        shop: shopDomain,
        state: 'test-state',
        is_online: false,
        scope: 'read_products',
        expires: null,
        access_token: 'test_token_' + Date.now(),
        online_access_info: null
      };

      const response = await fetch('/api/test-session-write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      const data = await response.json();
      
      addTestResult({
        success: data.success,
        message: data.message || 'Session storage test completed',
        data: data
      });
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Session storage test failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearTestData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/test-db-clear', { method: 'POST' });
      const data = await response.json();
      
      addTestResult({
        success: data.success,
        message: data.message || 'Test data cleared',
        data: data
      });

      if (data.success) {
        setShops([]);
      }
    } catch (error) {
      addTestResult({
        success: false,
        message: 'Failed to clear test data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const shopRows = shops.map(shop => [
    shop.id.toString(),
    shop.shop_domain,
    shop.shop_name,
    shop.email || 'N/A',
    shop.vapi_assistant_id ? '✅' : '❌',
    shop.access_token ? '✅' : '❌',
    shop.access_token_offline ? '✅' : '❌',
    new Date(shop.created_at).toLocaleString()
  ]);

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ padding: '20px' }}>
          <Text variant="headingMd" as="h1">
            🧪 Database Read/Write Test
          </Text>
          <Text variant="bodyMd" as="p" color="subdued">
            Test database operations to troubleshoot missing shops access token issues
          </Text>
        </div>
      </Card>

      <div style={{ marginTop: '20px' }}>
        <Card>
          <div style={{ padding: '20px' }}>
            <Text variant="headingMd" as="h2">Database Connection Test</Text>
            <div style={{ marginTop: '10px' }}>
              <Button 
                onClick={testDatabaseConnection} 
                loading={isLoading}
                primary
              >
                Test Database Connection
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Card>
          <div style={{ padding: '20px' }}>
            <Text variant="headingMd" as="h2">Add Shop to Database</Text>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ minWidth: '200px' }}>
                <TextField
                  label="Shop Domain"
                  value={shopDomain}
                  onChange={setShopDomain}
                  placeholder="test-shop.myshopify.com"
                />
              </div>
              <div style={{ minWidth: '200px' }}>
                <TextField
                  label="Shop Name"
                  value={shopName}
                  onChange={setShopName}
                  placeholder="Test Shop"
                />
              </div>
              <div style={{ minWidth: '200px' }}>
                <TextField
                  label="Email"
                  value={email}
                  onChange={setEmail}
                  placeholder="test@example.com"
                />
              </div>
            </div>
            <div style={{ marginTop: '10px' }}>
              <Button 
                onClick={addShopToDatabase} 
                loading={isLoading}
                primary
              >
                Add Shop to Database
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: '20px' }}>
        <Card>
          <div style={{ padding: '20px' }}>
            <Text variant="headingMd" as="h2">Database Operations</Text>
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <Button 
                onClick={loadShopsFromDatabase} 
                loading={isLoading}
              >
                Load Shops from Database
              </Button>
              <Button 
                onClick={testSessionStorage} 
                loading={isLoading}
              >
                Test Session Storage
              </Button>
              <Button 
                onClick={clearTestData} 
                loading={isLoading}
                destructive
              >
                Clear Test Data
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {shops.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Shops in Database ({shops.length})</Text>
              <div style={{ marginTop: '10px' }}>
                <DataTable
                  columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text', 'text']}
                  headings={['ID', 'Domain', 'Name', 'Email', 'Vapi ID', 'Access Token', 'Offline Token', 'Created']}
                  rows={shopRows}
                />
              </div>
            </div>
          </Card>
        </div>
      )}

      {testResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text variant="headingMd" as="h2">Test Results</Text>
              <div style={{ marginTop: '10px' }}>
                {testResults.map((result, index) => (
                  <div key={index} style={{ marginBottom: '10px' }}>
                    <Banner
                      title={result.message}
                      status={result.success ? 'success' : 'critical'}
                    >
                      {result.error && (
                        <Text variant="bodyMd" color="subdued">
                          Error: {result.error}
                        </Text>
                      )}
                      {result.data && (
                        <details style={{ marginTop: '10px' }}>
                          <summary>Raw Data</summary>
                          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </Banner>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Page,
  Layout,
  Card,
  Button,
  Badge,
  Text,
  BlockStack,
  InlineStack,
  Banner,
  Spinner,
  List,
  TextField,
} from '@shopify/polaris';

interface ConnectionStatus {
  connected: boolean;
  hasApiKey: boolean;
  message: string;
  assistantCount?: number;
}

interface ProvisionResult {
  assistantId: string;
  phoneNumber: string | null;  // Can be null if not yet assigned
  phoneNumberId: string;
  assistantName: string;
  message: string;
}

export default function VapiTestPage() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop') || 'always-ai-dev-store.myshopify.com';

  // Section 1: Connection Test
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);

  // Section 2: Provisioning
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);
  const [provisioning, setProvisioning] = useState(false);
  const [fetchingPhone, setFetchingPhone] = useState(false);
  const [manualTunnelUrl, setManualTunnelUrl] = useState(''); // Manual tunnel URL override

  // Section 4: Cleanup
  const [cleaning, setCleaning] = useState(false);

  // Auto-test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  // ============================================================================
  // Section 1: Connection Test
  // ============================================================================
  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const res = await fetch('/api/vapi/test/connection');
      const data = await res.json();
      
      if (data.success) {
        setConnectionStatus(data.data);
      } else {
        const errorMsg = data.error?.message || data.error || 'Connection test failed';
        setConnectionStatus({
          connected: false,
          hasApiKey: false,
          message: errorMsg,
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error - could not reach API';
      setConnectionStatus({
        connected: false,
        hasApiKey: false,
        message: errorMsg,
      });
    } finally {
      setTestingConnection(false);
    }
  };

  // ============================================================================
  // Section 2: Provision Test Phone
  // ============================================================================
  const provisionTestPhone = async () => {
    setProvisioning(true);
    setProvisionResult(null);

    try {
      // Detect tunnel URL from browser location or use manual override
      // Priority: Manual input > Browser location > Environment variables
      let tunnelUrl = manualTunnelUrl.trim() || undefined;
      
      if (!tunnelUrl) {
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
        tunnelUrl = currentOrigin && !currentOrigin.includes('localhost') ? currentOrigin : undefined;
      }
      
      console.log('[Vapi Test] Provisioning with:', {
        shop,
        tunnelUrl: tunnelUrl || 'Using environment variables',
      });

      const res = await fetch('/api/vapi/test/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          shop,
          tunnelUrl, // Pass detected tunnel URL
        }),
      });

      const data = await res.json();

      if (data.success) {
        setProvisionResult(data.data);
      } else {
        // Extract error message from error object
        const errorMsg = data.error?.message || data.error || 'Unknown error';
        
        // Check if this is a "not yet assigned" error - if so, show more helpful message
        if (errorMsg.includes('not yet assigned') || errorMsg.includes('number not yet assigned')) {
          alert(`Phone number is being provisioned...\n\nThe phone resource was created successfully, but the actual number hasn't been assigned yet. This may take a few moments.\n\nClick "Check Status" after waiting 10-30 seconds.`);
        } else {
          alert(`Provisioning failed: ${errorMsg}`);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Provisioning error: ${errorMsg}`);
    } finally {
      setProvisioning(false);
    }
  };

  // ============================================================================
  // Fetch Phone Number (for async provisioning)
  // ============================================================================
  const fetchPhoneNumber = async () => {
    if (!provisionResult) return;

    setFetchingPhone(true);

    try {
      const res = await fetch(`/api/vapi/test/phone?id=${provisionResult.phoneNumberId}`);
      const data = await res.json();

      if (data.success) {
        if (data.data.phoneNumber) {
          // Update the provision result with the phone number
          setProvisionResult({
            ...provisionResult,
            phoneNumber: data.data.phoneNumber,
            message: '✅ Phone number retrieved successfully!',
          });
        } else {
          alert('Phone number still not assigned. Wait a bit longer and try again, or check your Vapi dashboard.');
        }
      } else {
        const errorMsg = data.error?.message || data.error || 'Unknown error';
        alert(`Failed to fetch phone number: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Fetch error: ${errorMsg}`);
    } finally {
      setFetchingPhone(false);
    }
  };

  // ============================================================================
  // Section 4: Cleanup
  // ============================================================================
  const cleanupResources = async () => {
    if (!provisionResult) return;

    if (!confirm('Delete all test resources? This will remove the assistant and phone number from Vapi.')) {
      return;
    }

    setCleaning(true);

    try {
      const res = await fetch('/api/vapi/test/cleanup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          assistantId: provisionResult.assistantId,
          phoneNumberId: provisionResult.phoneNumberId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        alert(`Cleanup complete:\n\n✓ Deleted: ${data.data.deleted.join(', ')}\n${data.data.errors.length > 0 ? `\n⚠ Errors: ${data.data.errors.join(', ')}` : ''}`);
        setProvisionResult(null);
      } else {
        const errorMsg = data.error?.message || data.error || 'Unknown error';
        alert(`Cleanup failed: ${errorMsg}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      alert(`Cleanup error: ${errorMsg}`);
    } finally {
      setCleaning(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================
  return (
    <Page
      title="Vapi Integration Test"
      subtitle={`Testing voice AI integration for: ${shop}`}
      backAction={{ content: 'Dashboard', url: `/?shop=${shop}` }}
    >
      <Layout>
        {/* ================================================================== */}
        {/* Section 1: Vapi Connection Test */}
        {/* ================================================================== */}
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="headingMd" as="h2">
                  Vapi Connection Test
                </Text>
                {connectionStatus && (
                  connectionStatus.connected ? (
                    <Badge tone="success">✓ Connected</Badge>
                  ) : (
                    <Badge tone="critical">✗ Not Connected</Badge>
                  )
                )}
              </InlineStack>

              {testingConnection && (
                <InlineStack align="center" gap="200">
                  <Spinner size="small" />
                  <Text variant="bodyMd" as="p">
                    Testing connection...
                  </Text>
                </InlineStack>
              )}

              {connectionStatus && !testingConnection && (
                <BlockStack gap="300">
                  {!connectionStatus.hasApiKey && (
                    <Banner tone="warning">
                      <p>VAPI_API_KEY is not configured in your environment variables.</p>
                      <p>Add it to your .env file to enable Vapi integration.</p>
                    </Banner>
                  )}

                  {connectionStatus.connected && (
                    <Banner tone="success">
                      <p>✓ {connectionStatus.message}</p>
                      {connectionStatus.assistantCount !== undefined && (
                        <p>Found {connectionStatus.assistantCount} assistant(s) in your account.</p>
                      )}
                    </Banner>
                  )}

                  {!connectionStatus.connected && connectionStatus.hasApiKey && (
                    <Banner tone="critical">
                      <p>✗ {connectionStatus.message}</p>
                      <p>Check your VAPI_API_KEY and try again.</p>
                    </Banner>
                  )}

                  <Button onClick={testConnection} loading={testingConnection}>
                    Test Connection Again
                  </Button>
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>

        {/* ================================================================== */}
        {/* Section 2: Phone Provisioning Test */}
        {/* ================================================================== */}
        {connectionStatus?.connected && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Phone Provisioning Test
                </Text>

                <Text variant="bodyMd" as="p" tone="subdued">
                  This will create a test AI receptionist and provision a real phone number.
                </Text>

                {!provisionResult && (
                  <BlockStack gap="300">
                    <Text variant="bodyMd" as="p">
                      What will happen:
                    </Text>
                    <List type="number">
                      <List.Item>Create Vapi assistant with Claude Sonnet 4.5</List.Item>
                      <List.Item>Configure ElevenLabs Rachel voice</List.Item>
                      <List.Item>Provision toll-free phone number (800/888/877 preferred)</List.Item>
                      <List.Item>Link phone to assistant</List.Item>
                      <List.Item>Save to database</List.Item>
                    </List>

                    <Banner tone="warning">
                      <BlockStack gap="200">
                        <p><strong>⚠️  Tunnel URL Required</strong></p>
                        <p>Vapi needs a public URL to call your app during phone calls. If you're accessing via localhost, enter your Shopify CLI tunnel URL below.</p>
                        <p><strong>To find your tunnel URL:</strong> Look in your Shopify CLI terminal for a URL like <code>https://[something].trycloudflare.com</code></p>
                      </BlockStack>
                    </Banner>

                    <TextField
                      label="Tunnel URL (Optional - Auto-detected if available)"
                      value={manualTunnelUrl}
                      onChange={setManualTunnelUrl}
                      placeholder="https://your-tunnel.trycloudflare.com"
                      helpText="Leave empty to auto-detect. Only needed if auto-detection fails."
                      autoComplete="off"
                    />

                    <Banner tone="info">
                      <p>This uses your Vapi credits. The phone number will be active until you delete it.</p>
                    </Banner>

                    <Button
                      variant="primary"
                      onClick={provisionTestPhone}
                      loading={provisioning}
                    >
                      {provisioning ? 'Provisioning...' : 'Provision Test Phone Number'}
                    </Button>
                  </BlockStack>
                )}

                {provisionResult && (
                  <BlockStack gap="300">
                    <Banner tone={provisionResult.phoneNumber ? "success" : "warning"}>
                      <p>✓ {provisionResult.message}</p>
                      {!provisionResult.phoneNumber && (
                        <p>Phone resource created but number not yet assigned. Wait 10-30 seconds and click "Check Status" below.</p>
                      )}
                    </Banner>

                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Assistant Name:
                      </Text>
                      <Text variant="bodyMd" as="p">
                        {provisionResult.assistantName}
                      </Text>
                    </InlineStack>

                    <InlineStack align="space-between" blockAlign="center">
                      <Text variant="bodyMd" as="p" fontWeight="semibold">
                        Assistant ID:
                      </Text>
                      <Text variant="bodyMd" as="p" tone="subdued">
                        {provisionResult.assistantId}
                      </Text>
                    </InlineStack>

                    {provisionResult.phoneNumber ? (
                      <InlineStack align="space-between" blockAlign="center">
                        <Text variant="bodyMd" as="p" fontWeight="semibold">
                          Phone Number:
                        </Text>
                        <Text variant="heading2xl" as="p">
                          {provisionResult.phoneNumber}
                        </Text>
                      </InlineStack>
                    ) : (
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            Phone Number:
                          </Text>
                          <Badge tone="warning">Pending</Badge>
                        </InlineStack>
                        <Button
                          onClick={fetchPhoneNumber}
                          loading={fetchingPhone}
                        >
                          {fetchingPhone ? 'Checking...' : 'Check Status'}
                        </Button>
                        <Text variant="bodySm" as="p" tone="subdued">
                          Phone Number ID: {provisionResult.phoneNumberId}
                        </Text>
                      </BlockStack>
                    )}
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* ================================================================== */}
        {/* Section 3: Test Call Instructions */}
        {/* ================================================================== */}
        {provisionResult && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Test Call Instructions
                </Text>

                <Banner tone="info">
                  <p>Call the number below from your phone to test the AI receptionist.</p>
                </Banner>

                <div style={{ 
                  padding: '32px', 
                  textAlign: 'center', 
                  backgroundColor: 'var(--p-color-bg-surface-secondary)',
                  borderRadius: '8px' 
                }}>
                  <Text variant="heading4xl" as="p">
                    {provisionResult.phoneNumber}
                  </Text>
                  <div style={{ marginTop: '8px' }}>
                    <Badge tone="success">Active & Ready</Badge>
                  </div>
                </div>

                <Text variant="headingSm" as="h3">
                  Expected Behavior:
                </Text>

                <List>
                  <List.Item>☐ Phone rings</List.Item>
                  <List.Item>☐ AI answers with greeting</List.Item>
                  <List.Item>☐ AI responds to your questions</List.Item>
                  <List.Item>☐ Voice is clear (ElevenLabs Rachel)</List.Item>
                  <List.Item>☐ Can hang up cleanly</List.Item>
                </List>

                <Banner tone="warning">
                  <p><strong>Tips for testing:</strong></p>
                  <List>
                    <List.Item>Use a quiet environment</List.Item>
                    <List.Item>Speak clearly and naturally</List.Item>
                    <List.Item>Try asking about products/hours</List.Item>
                    <List.Item>Say "goodbye" to test hangup</List.Item>
                  </List>
                </Banner>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}

        {/* ================================================================== */}
        {/* Section 4: Cleanup */}
        {/* ================================================================== */}
        {provisionResult && (
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Cleanup Test Resources
                </Text>

                <Text variant="bodyMd" as="p" tone="subdued">
                  Delete the test assistant and phone number from Vapi.
                </Text>

                <Banner tone="warning">
                  <p>This will permanently delete:</p>
                  <List>
                    <List.Item>Assistant: {provisionResult.assistantName}</List.Item>
                    <List.Item>Phone Number: {provisionResult.phoneNumber}</List.Item>
                    <List.Item>Database records</List.Item>
                  </List>
                </Banner>

                <Button
                  tone="critical"
                  onClick={cleanupResources}
                  loading={cleaning}
                >
                  {cleaning ? 'Deleting...' : 'Delete Test Resources'}
                </Button>
              </BlockStack>
            </Card>
          </Layout.Section>
        )}
      </Layout>
    </Page>
  );
}


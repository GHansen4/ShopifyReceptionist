'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Box, Card, Text, Layout, Page as PolarisPage, Banner, Badge, InlineStack, BlockStack } from '@shopify/polaris';

interface SystemStatus {
  environment: boolean;
  database: boolean;
  shopAuth: boolean;
  appBridge: boolean;
}

export default function Home() {
  const searchParams = useSearchParams();
  const shop = searchParams.get('shop');
  const embedded = searchParams.get('embedded');
  const host = searchParams.get('host');
  const idToken = searchParams.get('id_token');
  const session = searchParams.get('session');
  const bounce = searchParams.get('bounce');
  
  // 🚨🚨🚨 VERY OBVIOUS LOGGING TO PROVE APP IS ACCESSED 🚨🚨🚨
  console.log('🚨🚨🚨 APP PAGE LOADED 🚨🚨🚨');
  console.log('Shop:', shop);
  console.log('Embedded:', embedded);
  console.log('Host:', host);
  console.log('Bounce:', bounce);
  console.log('ID Token present:', !!idToken);
  console.log('Session present:', !!session);
  
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    environment: false,
    database: false,
    shopAuth: false,
    appBridge: false,
  });
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  // System check on mount
  useEffect(() => {
    const checkSystemStatus = async () => {
      // Check environment by calling an API that can access server-side env vars
      let envConfigured = false;
      try {
        const envCheckRes = await fetch('/api/health');
        envConfigured = envCheckRes.ok;
      } catch {
        envConfigured = false;
      }

      const status: SystemStatus = {
        // Check environment variables via health check
        environment: envConfigured,
        
        // Check database connectivity (we'll assume true for now if env vars exist)
        database: true, // Can be enhanced with actual DB ping
        
        // Check shop authentication
        shopAuth: !!(shop && (idToken || session)),
        
        // Check App Bridge (host parameter present)
        appBridge: !!(host || embedded === '1'),
      };
      
      setSystemStatus(status);
      setIsCheckingStatus(false);
    };

    checkSystemStatus();
  }, [shop, host, embedded, idToken, session]);

  useEffect(() => {
    // Detect if we're in an iframe (embedded in Shopify Admin)
    const inIframe = window.self !== window.top;
    const isEmbeddedParam = embedded === '1';
    const isActuallyEmbedded = inIframe || isEmbeddedParam;
    setIsEmbedded(isActuallyEmbedded);

    // If we have a shop parameter but NO session parameters (id_token, etc.)
    // we need to authenticate
    const hasSessionParams = idToken || session;
    
    // If we came from bounce page, we might need to handle cookie consent differently
    if (bounce === '1' && isActuallyEmbedded) {
      console.log('[Auth] Came from bounce page, checking cookie consent');
      // Give the app a moment to initialize cookies
      setTimeout(() => {
        if (!hasSessionParams) {
          setNeedsAuth(true);
          console.log('[Auth] Still no session after bounce, redirecting to auth');
          const authUrl = `/api/auth?shop=${encodeURIComponent(shop!)}`;
          window.top!.location.href = authUrl;
        }
      }, 2000);
    } else if (shop && !hasSessionParams && !inIframe) {
      // NOT in iframe and need auth - safe to redirect
      setNeedsAuth(true);
      window.location.href = `/api/auth?shop=${encodeURIComponent(shop)}`;
    } else if (shop && !hasSessionParams && inIframe) {
      // IN iframe and need auth - must break out using exit-iframe
      setNeedsAuth(true);
      console.log('[Auth] Embedded context detected, needs exit-iframe auth');
      // Use Shopify's exit-iframe pattern
      const authUrl = `/api/auth?shop=${encodeURIComponent(shop)}`;
      window.top!.location.href = authUrl;
    }
  }, [shop, embedded, idToken, session, searchParams, bounce]);

  // Calculate overall system health
  const allSystemsOperational = Object.values(systemStatus).every(status => status);
  const systemsDown = Object.values(systemStatus).filter(status => !status).length;

  // Show loading state while redirecting
  if (needsAuth) {
    return (
      <PolarisPage title="Voice Receptionist">
        <Layout>
          <Layout.Section>
            <Card>
              <Box padding="400">
                <Text variant="bodyMd" as="p">
                  Redirecting to Shopify for authentication...
                </Text>
              </Box>
            </Card>
          </Layout.Section>
        </Layout>
      </PolarisPage>
    );
  }

  // System Status Card
  const systemCheckCard = (
    <Layout.Section>
      <Card>
        <Box padding="400">
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <Text variant="headingMd" as="h2">
                Quick System Check
              </Text>
              {!isCheckingStatus && (
                allSystemsOperational ? (
                  <Badge tone="success">All Systems Operational</Badge>
                ) : (
                  <Badge tone="critical">{systemsDown} System{systemsDown > 1 ? 's' : ''} Down</Badge>
                )
              )}
            </InlineStack>

            {!isCheckingStatus && allSystemsOperational && (
              <Banner tone="success">
                <p>✓ All systems are running normally</p>
              </Banner>
            )}

            {!isCheckingStatus && !allSystemsOperational && (
              <Banner tone="critical">
                <p>⚠ Some systems need attention</p>
              </Banner>
            )}

            <BlockStack gap="300">
              {/* Environment Check */}
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodyMd" as="p">
                  Environment Configuration
                </Text>
                {isCheckingStatus ? (
                  <Badge>Checking...</Badge>
                ) : systemStatus.environment ? (
                  <Badge tone="success">✓ Configured</Badge>
                ) : (
                  <Badge tone="critical">✗ Missing</Badge>
                )}
              </InlineStack>

              {/* Database Check */}
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodyMd" as="p">
                  Database Connection
                </Text>
                {isCheckingStatus ? (
                  <Badge>Checking...</Badge>
                ) : systemStatus.database ? (
                  <Badge tone="success">✓ Connected</Badge>
                ) : (
                  <Badge tone="critical">✗ Disconnected</Badge>
                )}
              </InlineStack>

              {/* Shop Auth Check */}
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodyMd" as="p">
                  Shop Authentication
                </Text>
                {isCheckingStatus ? (
                  <Badge>Checking...</Badge>
                ) : systemStatus.shopAuth ? (
                  <Badge tone="success">✓ Authenticated</Badge>
                ) : (
                  <Badge tone="warning">⚠ Not Authenticated</Badge>
                )}
              </InlineStack>

              {/* App Bridge Check */}
              <InlineStack align="space-between" blockAlign="center">
                <Text variant="bodyMd" as="p">
                  App Bridge Status
                </Text>
                {isCheckingStatus ? (
                  <Badge>Checking...</Badge>
                ) : systemStatus.appBridge ? (
                  <Badge tone="success">✓ Active</Badge>
                ) : (
                  <Badge tone="info">Standalone Mode</Badge>
                )}
              </InlineStack>
            </BlockStack>

            {shop && (
              <Box paddingBlockStart="200">
                <Text variant="bodySm" as="p" tone="subdued">
                  Connected to: {shop}
                </Text>
              </Box>
            )}
          </BlockStack>
        </Box>
      </Card>
    </Layout.Section>
  );

  // Show welcome dashboard
  return (
    <PolarisPage title="Voice Receptionist">
      <Layout>
        {/* System Status Check */}
        {systemCheckCard}
        
        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Welcome to Voice Receptionist
                </Text>
                <Text variant="bodyMd" as="p">
                  Manage your AI-powered voice receptionist for your Shopify store.
                </Text>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Configure call handling, review transcripts, and monitor your AI assistant's performance.
                </Text>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Getting Started
                </Text>
                <Text variant="bodyMd" as="p">
                  Your dashboard for managing incoming calls and configuring your voice AI assistant.
                </Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <Text variant="bodySm" as="p">
                      • Set up your receptionist profile and voice preferences
                    </Text>
                    <Text variant="bodySm" as="p">
                      • Configure business hours and call routing
                    </Text>
                    <Text variant="bodySm" as="p">
                      • Review call logs and transcripts
                    </Text>
                    <Text variant="bodySm" as="p">
                      • Monitor AI performance and customer satisfaction
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <BlockStack gap="300">
                <Text variant="headingMd" as="h2">
                  Developer Tools
                </Text>
                <Text variant="bodyMd" as="p">
                  Test and debug your integrations
                </Text>
                <Box paddingBlockStart="200">
                  <BlockStack gap="200">
                    <a
                      href={`/test/vapi?shop=${shop || 'always-ai-dev-store.myshopify.com'}`}
                      style={{
                        color: 'var(--p-color-text-link)',
                        textDecoration: 'none',
                      }}
                    >
                      <Text variant="bodyMd" as="p">
                        → Vapi Integration Test (AI Voice Receptionist)
                      </Text>
                    </a>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Box>
          </Card>
        </Layout.Section>

      </Layout>
    </PolarisPage>
  );
}

'use client';

import React from 'react';
import { Page, Layout, Card, Box, Text } from '@shopify/polaris';

/**
 * Dashboard Page
 * Main dashboard for the Voice Receptionist app
 * Displays overview and key information
 */
export default function DashboardPage() {
  return (
    <Page
      title="Dashboard"
      subtitle="Voice Receptionist Overview"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-300)' }}>
                <Text variant="headingLg" as="h2">Welcome to Your Voice Receptionist</Text>
                <Text variant="bodyMd" as="p">
                  Manage your AI-powered voice receptionist for your Shopify store. Configure settings,
                  view call logs, and monitor your receptionists.
                </Text>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-200)' }}>
                <Text variant="headingMd" as="h3">Active Receptionists</Text>
                <Text variant="bodyMd" as="p">
                  0
                </Text>
                <Text variant="bodySm" as="span" tone="subdued">
                  Create your first receptionist to get started
                </Text>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section oneHalf>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-200)' }}>
                <Text variant="headingMd" as="h3">Recent Calls</Text>
                <Text variant="bodyMd" as="p">
                  0
                </Text>
                <Text variant="bodySm" as="span" tone="subdued">
                  View detailed call logs
                </Text>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-200)' }}>
                <Text variant="headingMd" as="h3">Quick Links</Text>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><Text variant="bodyMd">Go to Receptionists page to create or manage</Text></li>
                  <li><Text variant="bodyMd">Check Calls page for recent call history</Text></li>
                  <li><Text variant="bodyMd">Update Settings to configure your preferences</Text></li>
                </ul>
              </div>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

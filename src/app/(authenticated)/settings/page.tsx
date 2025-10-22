'use client';

import React from 'react';
import { Page, Layout, Card, Box, Text, FormLayout, TextField, Button } from '@shopify/polaris';

export default function SettingsPage() {
  return (
    <Page
      title="Settings"
      subtitle="Configure your app settings"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-400)' }}>
                <div>
                  <Text variant="headingLg" as="h2">Application Settings</Text>
                  <Text variant="bodyMd" as="p" tone="subdued">
                    Configure how your voice receptionist behaves
                  </Text>
                </div>

                <FormLayout>
                  <TextField
                    label="App Name"
                    value="Voice Receptionist"
                    onChange={() => {}}
                    disabled
                  />
                  
                  <TextField
                    label="Default Language"
                    value="English"
                    onChange={() => {}}
                    disabled
                  />
                </FormLayout>

                <div style={{ display: 'flex', gap: 'var(--p-space-200)' }}>
                  <Button variant="primary" disabled>
                    Save Changes
                  </Button>
                </div>
              </div>
            </Box>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Box padding="400">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-200)' }}>
                <Text variant="headingMd" as="h3">About</Text>
                <Text variant="bodyMd" as="p">
                  Version: 1.0.0
                </Text>
                <Text variant="bodySm" as="p" tone="subdued">
                  Professional voice-first AI receptionist for Shopify stores
                </Text>
              </div>
            </Box>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

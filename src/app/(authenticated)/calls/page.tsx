'use client';

import React from 'react';
import { Page, Layout, Card, Box, Text, EmptyState } from '@shopify/polaris';

export default function CallsPage() {
  return (
    <Page
      title="Calls"
      subtitle="View and manage call history"
    >
      <Layout>
        <Layout.Section>
          <Card>
            <EmptyState
              heading="No calls yet"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/t/2/assets/blank-state.svg"
            >
              <Text variant="bodyMd" as="p">
                Once your voice receptionist receives calls, they will appear here.
              </Text>
            </EmptyState>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

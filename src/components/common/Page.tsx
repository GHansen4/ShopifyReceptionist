'use client';

import React from 'react';
import { Page } from '@shopify/polaris';

interface AppPageProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  primaryAction?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  secondaryActions?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Wrapper component for all app pages using Shopify Polaris Page component
 * Ensures consistent layout and spacing across the application
 */
export function AppPage({
  children,
  title,
  subtitle,
  primaryAction,
  secondaryActions,
  ...props
}: AppPageProps) {
  return (
    <Page
      title={title}
      subtitle={subtitle}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      {...props}
    >
      {children}
    </Page>
  );
}

export default AppPage;

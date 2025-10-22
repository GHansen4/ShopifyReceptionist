'use client';

// Import Polaris CSS FIRST before any other imports to ensure styles load properly
import '@shopify/polaris/build/esm/styles.css';

import React from 'react';
import { AppProvider } from '@shopify/polaris';
import enTranslations from '@shopify/polaris/locales/en.json';

interface PolarisProviderProps {
  children: React.ReactNode;
}

/**
 * PolarisProvider wraps the application with Shopify Polaris theming and i18n.
 * The Polaris CSS must be imported at the module level (first) to ensure
 * styles are available throughout the application.
 */
export function PolarisProvider({ children }: PolarisProviderProps) {
  return (
    <AppProvider
      i18n={enTranslations}
    >
      {children}
    </AppProvider>
  );
}

export default PolarisProvider;

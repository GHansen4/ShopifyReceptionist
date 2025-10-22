/**
 * Common type definitions for the Shopify Voice Receptionist app
 */

export interface Shop {
  id: string;
  name: string;
  domain: string;
  email: string;
  accessToken: string;
  plan: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  shopId: string;
  email: string;
  name: string;
  role: 'admin' | 'staff' | 'viewer';
  createdAt: Date;
  updatedAt: Date;
}

export interface ReceptionistConfig {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  phoneNumber: string;
  voiceId?: string;
  systemPrompt: string;
  hoursOfOperation?: string;
  isActive: boolean;
  vapiAssistantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallLog {
  id: string;
  receptionistId: string;
  phoneNumber: string;
  duration: number;
  status: 'completed' | 'missed' | 'failed';
  transcript?: string;
  summary?: string;
  createdAt: Date;
}

export interface SentryContext {
  userId?: string;
  shopId?: string;
  receptionistId?: string;
  [key: string]: unknown;
}

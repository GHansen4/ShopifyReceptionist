import { z } from 'zod';

// Shopify
export const shopifySessionSchema = z.object({
  id: z.string(),
  shop: z.string().url(),
  state: z.string(),
  isOnline: z.boolean().optional(),
  expires: z.date().optional(),
  accessToken: z.string(),
  scope: z.string().array(),
});

export type ShopifySession = z.infer<typeof shopifySessionSchema>;

// Vapi Call
export const vapiCallSchema = z.object({
  id: z.string(),
  assistantId: z.string(),
  phoneNumber: z.string(),
  customerId: z.string().optional(),
  status: z.enum(['active', 'completed', 'failed']),
  duration: z.number().optional(),
  transcript: z.string().optional(),
  summary: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VapiCall = z.infer<typeof vapiCallSchema>;

// Vapi Assistant Configuration
export const vapiAssistantSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  systemPrompt: z.string(),
  voiceId: z.string(),
  backendUrl: z.string().url().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type VapiAssistant = z.infer<typeof vapiAssistantSchema>;

// Receptionist Profile
export const receptionistProfileSchema = z.object({
  id: z.string(),
  shopId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/),
  voiceId: z.string().optional(),
  systemPrompt: z.string().min(10).max(2000),
  hoursOfOperation: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ReceptionistProfile = z.infer<typeof receptionistProfileSchema>;

// Create Receptionist Request
export const createReceptionistRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  voiceId: z.string().optional(),
  systemPrompt: z.string().min(10).max(2000),
  hoursOfOperation: z.string().optional(),
});

export type CreateReceptionistRequest = z.infer<typeof createReceptionistRequestSchema>;

// Pagination
export const paginationSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

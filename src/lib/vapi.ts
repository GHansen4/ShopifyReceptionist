import { vapi } from './vapi/client';
import { ExternalServiceError, ValidationError } from './utils/errors';
import { logError } from './utils/errors';
import { Product } from './supabase/db';

// ============================================================================
// Types
// ============================================================================

export interface VapiAssistantConfig {
  shopId: string;
  shopName: string;
  products: Product[];
  voiceId?: string;
  systemPrompt?: string;
  hoursOfOperation?: string;
}

export interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number; // Initial backoff in milliseconds
}

// ============================================================================
// System Prompt Generation
// ============================================================================

/**
 * Generate system prompt for Vapi assistant
 * Includes shop context, product knowledge, and behavioral guidelines
 */
function generateSystemPrompt(config: VapiAssistantConfig): string {
  const { shopName, products, hoursOfOperation } = config;

  // Format top 20 products for context
  const topProducts = products.slice(0, 20);
  const productList = topProducts
    .map((p, idx) => {
      const price = p.price ? `$${(p.price / 100).toFixed(2)}` : 'Contact for pricing';
      return `${idx + 1}. ${p.title} - ${price}`;
    })
    .join('\n');

  const hoursSection = hoursOfOperation ? `\n\nBusiness Hours:\n${hoursOfOperation}` : '';

  return `You are a professional phone receptionist for ${shopName}.

Your role:
- Answer customer inquiries about products and orders
- Be warm, friendly, and concise
- Handle calls professionally and efficiently
- Available to help customers during business hours

Conversation Guidelines:
- Keep responses brief and natural (under 30 seconds)
- Use a conversational, professional tone
- Ask clarifying questions if needed
- Transfer complex issues to human staff when needed
- Always be honest about product information

Available Products (${topProducts.length} most popular):
${productList}

You have access to two functions:
1. order_lookup - Look up customer orders by phone number or order ID
2. product_search - Search for products by name or category

Example Conversation:
Customer: "Do you have the blue shirt in size M?"
You: "Yes, we have the blue shirt available in size M. Would you like me to check our current stock or help you place an order?"

Important:
- Don't mention being an AI unless directly asked
- Don't make up product information - use available products only
- If unsure, offer to connect them with a team member
- Always ask how you can help at the start of the call${hoursSection}`;
}

// ============================================================================
// Retry Logic
// ============================================================================

/**
 * Retry wrapper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = options.maxAttempts || 3;
  const initialBackoff = options.backoffMs || 1000;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on validation errors
      if (
        lastError.message.includes('invalid') ||
        lastError.message.includes('invalid parameter')
      ) {
        logError(lastError, {
          context,
          attempt,
          type: 'validation_error',
        });
        throw new ValidationError(lastError.message);
      }

      // Log retry attempt
      console.warn(`${context} attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);

      // Last attempt - don't backoff
      if (attempt === maxAttempts) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const backoffMs = initialBackoff * Math.pow(2, attempt - 1);
      console.log(`Retrying ${context} after ${backoffMs}ms...`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  logError(lastError, {
    context,
    totalAttempts: maxAttempts,
    type: 'max_retries_exceeded',
  });

  throw new ExternalServiceError(
    `Failed to ${context} after ${maxAttempts} attempts: ${lastError?.message}`,
    'vapi',
    { attempts: maxAttempts }
  );
}

// ============================================================================
// Vapi Assistant Creation
// ============================================================================

/**
 * Create Vapi assistant with comprehensive configuration
 * This is the CRITICAL function that sets up the AI receptionist
 */
export async function createVapiAssistant(config: VapiAssistantConfig): Promise<{
  assistantId: string;
  name: string;
}> {
  return retryWithBackoff(
    async () => {
      const systemPrompt = generateSystemPrompt(config);

      // Build assistant configuration
      const assistantConfig = {
        name: `${config.shopName} Receptionist`,
        model: {
          provider: 'openai',
          model: 'gpt-4-turbo',
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
          ],
          temperature: 0.7,
          maxTokens: 500,
        },
        voice: {
          provider: 'elevenlabs',
          voiceId: config.voiceId || 'rachel',
          stability: 0.5,
          similarityBoost: 0.75,
          speed: 1.0,
        },
        firstMessage: `Hi! Thanks for calling ${config.shopName}. How can I help you today?`,
        voicemail: {
          enabled: true,
          message: `Hi! This is ${config.shopName}'s AI receptionist. I'm currently unavailable, but please leave your message and phone number, and we'll get back to you as soon as possible.`,
        },
        interruptionThreshold: 100,
        silenceThreshold: 3000, // 3 seconds of silence
        maxDurationSeconds: 3600, // 1 hour max
        recordingEnabled: true,
        functions: [
          {
            name: 'order_lookup',
            description: 'Look up customer orders by phone number or order ID',
            parameters: {
              type: 'object',
              properties: {
                phone: {
                  type: 'string',
                  description: 'Customer phone number',
                },
                orderId: {
                  type: 'string',
                  description: 'Order ID',
                },
              },
            },
          },
          {
            name: 'search_products',
            description: 'Search for products by name or category',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Product name or category to search',
                },
              },
              required: ['query'],
            },
          },
        ],
        serverUrl: `${process.env.NEXT_PUBLIC_APP_URL || process.env.SHOPIFY_APP_URL}/api/vapi/functions/${config.shopId}`,
        serverUrlSecret: process.env.VAPI_API_KEY,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (vapi as any).assistants.create(assistantConfig);

      if (!response?.id) {
        throw new Error('No assistant ID returned from Vapi');
      }

      return {
        assistantId: response.id as string,
        name: response.name as string,
      };
    },
    'create Vapi assistant',
    { maxAttempts: 3, backoffMs: 1000 }
  );
}

// ============================================================================
// Phone Number Provisioning
// ============================================================================

/**
 * Provision a phone number for the assistant
 * Tries toll-free first, then falls back to area codes
 */
export async function provisionPhoneNumber(
  assistantId: string,
  areaCode?: string
): Promise<string> {
  const tollFreeAreaCodes = ['800', '888', '877', '866'];
  const areaCodestoTry = areaCode
    ? [areaCode, ...tollFreeAreaCodes]
    : [...tollFreeAreaCodes, '212', '415', '510'];

  let lastError: Error | null = null;

  for (const code of areaCodestoTry) {
    try {
      return await retryWithBackoff(
        async () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const response = await (vapi as any).phoneNumbers.create({
            assistantId,
            areaCode: code,
            name: `Receptionist-${assistantId.slice(0, 8)}`,
          });

          if (!response?.phoneNumber) {
            throw new Error('No phone number returned from Vapi');
          }

          return response.phoneNumber as string;
        },
        `provision phone number with area code ${code}`,
        { maxAttempts: 2, backoffMs: 500 }
      );
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this area code failed, try the next one
      if (code !== areaCodestoTry[areaCodestoTry.length - 1]) {
        console.warn(`Area code ${code} unavailable, trying next option...`);
        continue;
      }
    }
  }

  logError(lastError, {
    context: 'provision_phone_number',
    assistantId,
    attemptedAreaCodes: areaCodestoTry,
  });

  throw new ExternalServiceError('No phone numbers available. Please try again later.', 'vapi', {
    attemptedAreaCodes: areaCodestoTry,
  });
}

// ============================================================================
// Complete Provisioning Workflow
// ============================================================================

/**
 * Complete workflow: Create assistant and provision phone number
 */
export async function provisionReceptionist(config: VapiAssistantConfig): Promise<{
  assistantId: string;
  phoneNumber: string;
  assistantName: string;
}> {
  try {
    // Step 1: Create assistant
    console.log(`Creating Vapi assistant for ${config.shopName}...`);
    const { assistantId, name } = await createVapiAssistant(config);
    console.log(`✅ Assistant created: ${assistantId}`);

    // Step 2: Provision phone number
    console.log(`Provisioning phone number for assistant...`);
    const phoneNumber = await provisionPhoneNumber(assistantId);
    console.log(`✅ Phone number provisioned: ${phoneNumber}`);

    return {
      assistantId,
      phoneNumber,
      assistantName: name,
    };
  } catch (error) {
    logError(error, {
      context: 'provision_receptionist',
      shop: config.shopName,
    });
    throw error;
  }
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate Vapi assistant configuration before creation
 */
export function validateAssistantConfig(config: VapiAssistantConfig): void {
  if (!config.shopId) {
    throw new ValidationError('Shop ID is required');
  }

  if (!config.shopName || config.shopName.trim().length === 0) {
    throw new ValidationError('Shop name is required');
  }

  if (!Array.isArray(config.products) || config.products.length === 0) {
    throw new ValidationError('At least one product is required');
  }

  if (config.voiceId && typeof config.voiceId !== 'string') {
    throw new ValidationError('Voice ID must be a string');
  }
}

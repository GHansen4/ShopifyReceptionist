// Vapi SDK for voice AI - use dynamic import to handle CommonJS/ESM
import { env } from '../env';

// Type the client properly - disable eslint for SDK typing issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vapiClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getVapiClient(): any {
  if (!vapiClient) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const VapiSDK = require('@vapi-ai/server-sdk');
      
      console.log('[Vapi Client] SDK module keys:', Object.keys(VapiSDK));
      
      // The Vapi SDK exports named classes: Vapi, VapiClient, VapiError, etc.
      // Try to find the correct client class
      let VapiClass = null;
      
      // Priority 1: Try VapiClient (most likely the main client class)
      if (VapiSDK.VapiClient) {
        VapiClass = VapiSDK.VapiClient;
        console.log('[Vapi Client] Using VapiClient class');
      } 
      // Priority 2: Try Vapi (alternative name)
      else if (VapiSDK.Vapi) {
        VapiClass = VapiSDK.Vapi;
        console.log('[Vapi Client] Using Vapi class');
      }
      // Priority 3: Try default export
      else if (VapiSDK.default) {
        VapiClass = VapiSDK.default;
        console.log('[Vapi Client] Using default export');
      }
      // Priority 4: Try direct function export
      else if (typeof VapiSDK === 'function') {
        VapiClass = VapiSDK;
        console.log('[Vapi Client] Using direct function export');
      }
      else {
        console.error('[Vapi Client] No suitable constructor found');
        console.error('[Vapi Client] Available exports:', Object.keys(VapiSDK));
        console.error('[Vapi Client] Types:', Object.keys(VapiSDK).map(k => `${k}: ${typeof VapiSDK[k]}`));
        throw new Error(`Vapi SDK: No suitable client class found. Available exports: ${Object.keys(VapiSDK).join(', ')}`);
      }
      
      // Try instantiating with options object pattern: { token: 'xxx' }
      try {
        vapiClient = new VapiClass({ token: env.VAPI_API_KEY });
        console.log('[Vapi Client] ✅ Initialized with { token } pattern');
      } catch (e1) {
        console.warn('[Vapi Client] Failed with { token } pattern, trying direct token:', (e1 as Error).message);
        // Fallback: try direct token string
        try {
          vapiClient = new VapiClass(env.VAPI_API_KEY);
          console.log('[Vapi Client] ✅ Initialized with direct token');
        } catch (e2) {
          console.error('[Vapi Client] Both constructor patterns failed');
          throw new Error(`Failed to instantiate Vapi client: ${(e2 as Error).message}`);
        }
      }
      
      // Verify the client has expected methods
      if (!vapiClient || typeof vapiClient !== 'object') {
        throw new Error('Vapi client is not an object');
      }
      
      const hasAssistants = vapiClient.assistants && typeof vapiClient.assistants === 'object';
      const hasPhoneNumbers = vapiClient.phoneNumbers && typeof vapiClient.phoneNumbers === 'object';
      
      if (!hasAssistants || !hasPhoneNumbers) {
        console.error('[Vapi Client] Client structure:', Object.keys(vapiClient));
        throw new Error(`Vapi client missing expected methods. Has assistants: ${hasAssistants}, Has phoneNumbers: ${hasPhoneNumbers}`);
      }
      
      console.log('[Vapi Client] ✅ Client ready with assistants and phoneNumbers methods');
    } catch (error) {
      console.error('[Vapi Client] ❌ Failed to initialize:', error);
      throw error;
    }
  }
  return vapiClient;
}

export const vapi = getVapiClient();

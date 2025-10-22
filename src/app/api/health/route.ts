import { createSuccessResponse } from '@/lib/utils/api';

export async function GET() {
  return createSuccessResponse({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
}

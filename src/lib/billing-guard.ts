export interface BillingCheckResult {
  allowed: boolean;
  reason?: string;
  subscription_status?: string;
  usage_percentage?: number;
  minutes_remaining?: number;
}

export async function checkBillingStatus() {
  return { allowed: true };
}

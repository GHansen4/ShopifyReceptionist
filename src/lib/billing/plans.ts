export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  minutes: number;
  description: string;
}

export const BILLING_PLANS: Record<string, BillingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 79,
    minutes: 200,
    description: 'Perfect for small businesses',
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 149,
    minutes: 500,
    description: 'For growing teams',
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 299,
    minutes: 1000,
    description: 'Maximum capacity',
  },
};

export const FREE_TRIAL = {
  duration_days: 7,
  minutes: 200,
};

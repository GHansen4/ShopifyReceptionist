export interface VapiWebhookPayload {
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface CallStartedData {
  vapi_call_id: string;
  customer_phone: string;
  assistant_id: string;
}

export interface CallEndedData {
  vapi_call_id: string;
  ended_at: string;
  duration_seconds: number;
  end_reason: string;
  transcript?: string;
}

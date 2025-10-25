export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      shopify_sessions: {
        Row: {
          id: string
          shop: string
          state: string
          is_online: boolean
          scope: string | null
          expires: string | null
          access_token: string | null
          online_access_info: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          shop: string
          state: string
          is_online?: boolean
          scope?: string | null
          expires?: string | null
          access_token?: string | null
          online_access_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          shop?: string
          state?: string
          is_online?: boolean
          scope?: string | null
          expires?: string | null
          access_token?: string | null
          online_access_info?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          id: string
          shop_domain: string
          shop_name: string | null
          email: string | null
          timezone: string
          phone_number: string | null
          vapi_assistant_id: string | null
          vapi_phone_number_id: string | null
          provisioned_phone_number: string | null
          settings: Json
          subscription_status: 'trial' | 'active' | 'cancelled' | 'suspended'
          subscription_id: string | null
          plan_name: string
          call_minutes_used: number
          call_minutes_limit: number
          installed_at: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_domain: string
          shop_name?: string | null
          email?: string | null
          timezone?: string
          phone_number?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          provisioned_phone_number?: string | null
          settings?: Json
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'suspended'
          subscription_id?: string | null
          plan_name?: string
          call_minutes_used?: number
          call_minutes_limit?: number
          installed_at?: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_domain?: string
          shop_name?: string | null
          email?: string | null
          timezone?: string
          phone_number?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          provisioned_phone_number?: string | null
          settings?: Json
          subscription_status?: 'trial' | 'active' | 'cancelled' | 'suspended'
          subscription_id?: string | null
          plan_name?: string
          call_minutes_used?: number
          call_minutes_limit?: number
          installed_at?: string
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
      calls: {
        Row: {
          id: string
          shop_id: string
          vapi_call_id: string
          customer_phone: string
          customer_name: string | null
          duration_seconds: number
          cost_cents: number
          recording_url: string | null
          transcript: Json | null
          summary: string | null
          sentiment: 'positive' | 'neutral' | 'negative' | null
          resolution_status: 'resolved' | 'escalated' | 'abandoned'
          tags: string[]
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          vapi_call_id: string
          customer_phone: string
          customer_name?: string | null
          duration_seconds?: number
          cost_cents?: number
          recording_url?: string | null
          transcript?: Json | null
          summary?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          resolution_status?: 'resolved' | 'escalated' | 'abandoned'
          tags?: string[]
          started_at: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          vapi_call_id?: string
          customer_phone?: string
          customer_name?: string | null
          duration_seconds?: number
          cost_cents?: number
          recording_url?: string | null
          transcript?: Json | null
          summary?: string | null
          sentiment?: 'positive' | 'neutral' | 'negative' | null
          resolution_status?: 'resolved' | 'escalated' | 'abandoned'
          tags?: string[]
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          }
        ]
      }
      call_actions: {
        Row: {
          id: string
          call_id: string
          action_type: 'order_lookup' | 'product_search' | 'transfer_attempt'
          action_data: Json
          success: boolean
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          action_type: 'order_lookup' | 'product_search' | 'transfer_attempt'
          action_data: Json
          success: boolean
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          action_type?: 'order_lookup' | 'product_search' | 'transfer_attempt'
          action_data?: Json
          success?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_actions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          }
        ]
      }
      products: {
        Row: {
          id: string
          shop_id: string
          shopify_product_id: string
          title: string
          description: string | null
          price: number
          currency: string
          inventory_quantity: number
          image_url: string | null
          product_url: string | null
          variants: Json | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          shop_id: string
          shopify_product_id: string
          title: string
          description?: string | null
          price: number
          currency: string
          inventory_quantity: number
          image_url?: string | null
          product_url?: string | null
          variants?: Json | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          shop_id?: string
          shopify_product_id?: string
          title?: string
          description?: string | null
          price?: number
          currency?: string
          inventory_quantity?: number
          image_url?: string | null
          product_url?: string | null
          variants?: Json | null
          updated_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      subscription_status: 'trial' | 'active' | 'cancelled' | 'suspended'
      call_sentiment: 'positive' | 'neutral' | 'negative'
      resolution_status: 'resolved' | 'escalated' | 'abandoned'
      action_type: 'order_lookup' | 'product_search' | 'transfer_attempt'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

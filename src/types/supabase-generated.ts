// Generated types from live database
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      shops: {
        Row: {
          id: number
          shop_domain: string
          shop_name: string
          email: string | null
          timezone: string | null
          phone_number: string | null
          vapi_assistant_id: string | null
          vapi_phone_number_id: string | null
          provisioned_phone_number: string | null
          settings: Json | null
          subscription_status: string | null
          subscription_id: string | null
          plan_name: string | null
          call_minutes_used: number
          call_minutes_limit: number
          installed_at: string | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          shop_domain: string
          shop_name: string
          email?: string | null
          timezone?: string | null
          phone_number?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          provisioned_phone_number?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_id?: string | null
          plan_name?: string | null
          call_minutes_used?: number
          call_minutes_limit?: number
          installed_at?: string | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          shop_domain?: string
          shop_name?: string
          email?: string | null
          timezone?: string | null
          phone_number?: string | null
          vapi_assistant_id?: string | null
          vapi_phone_number_id?: string | null
          provisioned_phone_number?: string | null
          settings?: Json | null
          subscription_status?: string | null
          subscription_id?: string | null
          plan_name?: string | null
          call_minutes_used?: number
          call_minutes_limit?: number
          installed_at?: string | null
          updated_at?: string
          created_at?: string
        }
        Relationships: []
      }
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
      calls: {
        Row: {
          id: number
          shop_id: number
          vapi_call_id: string
          customer_phone: string | null
          customer_name: string | null
          duration_seconds: number | null
          cost_cents: number | null
          recording_url: string | null
          transcript: string | null
          summary: string | null
          sentiment: string | null
          resolution_status: string | null
          tags: string[] | null
          started_at: string | null
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: number
          shop_id: number
          vapi_call_id: string
          customer_phone?: string | null
          customer_name?: string | null
          duration_seconds?: number | null
          cost_cents?: number | null
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
          resolution_status?: string | null
          tags?: string[] | null
          started_at?: string | null
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: number
          shop_id?: number
          vapi_call_id?: string
          customer_phone?: string | null
          customer_name?: string | null
          duration_seconds?: number | null
          cost_cents?: number | null
          recording_url?: string | null
          transcript?: string | null
          summary?: string | null
          sentiment?: string | null
          resolution_status?: string | null
          tags?: string[] | null
          started_at?: string | null
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
          id: number
          call_id: number
          action_type: string
          action_data: Json | null
          success: boolean
          created_at: string
        }
        Insert: {
          id?: number
          call_id: number
          action_type: string
          action_data?: Json | null
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: number
          call_id?: number
          action_type?: string
          action_data?: Json | null
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
          id: number
          shop_id: number
          shopify_product_id: string
          title: string
          description: string | null
          price: number | null
          currency: string | null
          inventory_quantity: number | null
          image_url: string | null
          product_url: string | null
          variants: Json | null
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: number
          shop_id: number
          shopify_product_id: string
          title: string
          description?: string | null
          price?: number | null
          currency?: string | null
          inventory_quantity?: number | null
          image_url?: string | null
          product_url?: string | null
          variants?: Json | null
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: number
          shop_id?: number
          shopify_product_id?: string
          title?: string
          description?: string | null
          price?: number | null
          currency?: string | null
          inventory_quantity?: number | null
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
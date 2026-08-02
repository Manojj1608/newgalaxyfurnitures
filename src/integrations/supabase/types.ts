export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          details: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          display_order: number
          id: string
          meta_description: string | null
          meta_title: string | null
          name: string
          parent_id: string | null
          slug: string
          thumbnail_url: string | null
          updated_at: string
          visible: boolean
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name: string
          parent_id?: string | null
          slug: string
          thumbnail_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
          thumbnail_url?: string | null
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      enquiries: {
        Row: {
          channel: string
          created_at: string
          customer_name: string | null
          email: string | null
          id: string
          message: string | null
          notes: string | null
          phone: string | null
          product_id: string | null
          product_name: string | null
          source_page: string | null
          status: string
          updated_at: string
        }
        Insert: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          email?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          product_name?: string | null
          source_page?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_name?: string | null
          email?: string | null
          id?: string
          message?: string | null
          notes?: string | null
          phone?: string | null
          product_id?: string | null
          product_name?: string | null
          source_page?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enquiries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      hero_banners: {
        Row: {
          active: boolean
          button_link: string | null
          button_text: string | null
          created_at: string
          end_date: string | null
          eyebrow: string | null
          id: string
          image_url: string
          priority: number
          start_date: string | null
          subtitle: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          end_date?: string | null
          eyebrow?: string | null
          id?: string
          image_url: string
          priority?: number
          start_date?: string | null
          subtitle?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          button_link?: string | null
          button_text?: string | null
          created_at?: string
          end_date?: string | null
          eyebrow?: string | null
          id?: string
          image_url?: string
          priority?: number
          start_date?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homepage_sections: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          section_type: string
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          section_type: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          section_type?: string
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          alt: string | null
          created_at: string
          height: number | null
          id: string
          mime_type: string | null
          path: string
          size_bytes: number | null
          updated_at: string
          uploaded_by: string | null
          url: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          path: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          url: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          path?: string
          size_bytes?: number | null
          updated_at?: string
          uploaded_by?: string | null
          url?: string
          width?: number | null
        }
        Relationships: []
      }
      product_views: {
        Row: {
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          bestseller: boolean
          brand: string | null
          category: string
          category_id: string | null
          color: string | null
          created_at: string
          deleted_at: string | null
          delivery_info: string | null
          description: string | null
          dimensions: string | null
          enquiry_count: number
          featured: boolean
          finish: string | null
          hover_image_url: string | null
          id: string
          images: Json
          in_stock: boolean
          keywords: string | null
          low_stock_threshold: number
          material: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          new_arrival: boolean
          on_sale: boolean
          price: number
          product_code: string | null
          sale_price: number | null
          short_description: string | null
          size: string | null
          sku: string | null
          slug: string
          status: string
          stock_quantity: number
          style: string | null
          subcategory_id: string | null
          tags: string[]
          trending: boolean
          updated_at: string
          view_count: number
          warranty: string | null
          weight: string | null
        }
        Insert: {
          bestseller?: boolean
          brand?: string | null
          category: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_info?: string | null
          description?: string | null
          dimensions?: string | null
          enquiry_count?: number
          featured?: boolean
          finish?: string | null
          hover_image_url?: string | null
          id?: string
          images?: Json
          in_stock?: boolean
          keywords?: string | null
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          new_arrival?: boolean
          on_sale?: boolean
          price?: number
          product_code?: string | null
          sale_price?: number | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          slug: string
          status?: string
          stock_quantity?: number
          style?: string | null
          subcategory_id?: string | null
          tags?: string[]
          trending?: boolean
          updated_at?: string
          view_count?: number
          warranty?: string | null
          weight?: string | null
        }
        Update: {
          bestseller?: boolean
          brand?: string | null
          category?: string
          category_id?: string | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          delivery_info?: string | null
          description?: string | null
          dimensions?: string | null
          enquiry_count?: number
          featured?: boolean
          finish?: string | null
          hover_image_url?: string | null
          id?: string
          images?: Json
          in_stock?: boolean
          keywords?: string | null
          low_stock_threshold?: number
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          new_arrival?: boolean
          on_sale?: boolean
          price?: number
          product_code?: string | null
          sale_price?: number | null
          short_description?: string | null
          size?: string | null
          sku?: string | null
          slug?: string
          status?: string
          stock_quantity?: number
          style?: string | null
          subcategory_id?: string | null
          tags?: string[]
          trending?: boolean
          updated_at?: string
          view_count?: number
          warranty?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          about_text: string | null
          address: string
          company_name: string
          created_at: string
          email: string
          facebook_url: string | null
          faq_text: string | null
          footer_note: string | null
          id: boolean
          instagram_url: string | null
          logo_url: string | null
          maps_embed_url: string | null
          phone: string
          pinterest_url: string | null
          privacy_text: string | null
          return_policy_text: string | null
          showroom_hours: string
          tagline: string
          terms_text: string | null
          updated_at: string
          whatsapp: string
          youtube_url: string | null
        }
        Insert: {
          about_text?: string | null
          address?: string
          company_name?: string
          created_at?: string
          email?: string
          facebook_url?: string | null
          faq_text?: string | null
          footer_note?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          maps_embed_url?: string | null
          phone?: string
          pinterest_url?: string | null
          privacy_text?: string | null
          return_policy_text?: string | null
          showroom_hours?: string
          tagline?: string
          terms_text?: string | null
          updated_at?: string
          whatsapp?: string
          youtube_url?: string | null
        }
        Update: {
          about_text?: string | null
          address?: string
          company_name?: string
          created_at?: string
          email?: string
          facebook_url?: string | null
          faq_text?: string | null
          footer_note?: string | null
          id?: boolean
          instagram_url?: string | null
          logo_url?: string | null
          maps_embed_url?: string | null
          phone?: string
          pinterest_url?: string | null
          privacy_text?: string | null
          return_policy_text?: string | null
          showroom_hours?: string
          tagline?: string
          terms_text?: string | null
          updated_at?: string
          whatsapp?: string
          youtube_url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "user" | "manager" | "editor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "manager", "editor"],
    },
  },
} as const

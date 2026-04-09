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
      appeals: {
        Row: {
          admin_response: string | null
          appeal_type: string
          created_at: string | null
          id: string
          reason: string
          resolved_at: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          admin_response?: string | null
          appeal_type: string
          created_at?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          admin_response?: string | null
          appeal_type?: string
          created_at?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_content_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_content_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_content_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      bubble_colors: {
        Row: {
          created_at: string
          css_class: string
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          css_class: string
          id?: string
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          css_class?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_members: {
        Row: {
          conversation_id: string
          id: string
          is_muted: boolean | null
          is_pinned: boolean
          joined_at: string
          last_read_at: string | null
          role: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_muted?: boolean | null
          is_pinned?: boolean
          joined_at?: string
          last_read_at?: string | null
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_discoverable: boolean | null
          name: string | null
          rules: string | null
          type: Database["public"]["Enums"]["conversation_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_discoverable?: boolean | null
          name?: string | null
          rules?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_discoverable?: boolean | null
          name?: string | null
          rules?: string | null
          type?: Database["public"]["Enums"]["conversation_type"]
          updated_at?: string
        }
        Relationships: []
      }
      gift_types: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          price: number
          receiver_percentage: number
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          name: string
          price: number
          receiver_percentage?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          price?: number
          receiver_percentage?: number
        }
        Relationships: []
      }
      gifts: {
        Row: {
          created_at: string
          gift_type_id: string
          id: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          gift_type_id: string
          id?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          created_at?: string
          gift_type_id?: string
          id?: string
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_gift_type_id_fkey"
            columns: ["gift_type_id"]
            isOneToOne: false
            referencedRelation: "gift_types"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          conversation_id: string
          created_at: string | null
          id: string
          invited_by: string
          invited_user_id: string
          status: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string | null
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string | null
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      media_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          media_url: string
          message_id: string | null
          reason: string
          reporter_id: string
          resolved_at: string | null
          status: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          media_url: string
          message_id?: string | null
          reason?: string
          reporter_id: string
          resolved_at?: string | null
          status?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          media_url?: string
          message_id?: string | null
          reason?: string
          reporter_id?: string
          resolved_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_reports_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          deleted_by_users: string[] | null
          id: string
          image_url: string | null
          is_deleted_for_all: boolean | null
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_by_users?: string[] | null
          id?: string
          image_url?: string | null
          is_deleted_for_all?: boolean | null
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_by_users?: string[] | null
          id?: string
          image_url?: string | null
          is_deleted_for_all?: boolean | null
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      pinned_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string | null
          id: string
          pinned_by: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string | null
          id?: string
          pinned_by: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          pinned_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "pinned_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profanity_words: {
        Row: {
          created_at: string | null
          id: string
          word: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          word: string
        }
        Update: {
          created_at?: string | null
          id?: string
          word?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          anonymous_name: string
          avatar_id: number | null
          avatar_url: string | null
          ban_expires_at: string | null
          ban_reason: string | null
          bio: string | null
          bubble_color: string | null
          created_at: string
          gender: string | null
          gift_black_orchid: number
          gift_diamond: number
          gift_heart: number
          gift_plushie: number
          id: string
          is_admin: boolean
          is_banned: boolean
          is_jailed: boolean | null
          is_muted: boolean | null
          is_online: boolean | null
          is_premium: boolean | null
          jail_expires_at: string | null
          last_active_at: string | null
          points: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          age?: number | null
          anonymous_name?: string
          avatar_id?: number | null
          avatar_url?: string | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          bubble_color?: string | null
          created_at?: string
          gender?: string | null
          gift_black_orchid?: number
          gift_diamond?: number
          gift_heart?: number
          gift_plushie?: number
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          is_jailed?: boolean | null
          is_muted?: boolean | null
          is_online?: boolean | null
          is_premium?: boolean | null
          jail_expires_at?: string | null
          last_active_at?: string | null
          points?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          age?: number | null
          anonymous_name?: string
          avatar_id?: number | null
          avatar_url?: string | null
          ban_expires_at?: string | null
          ban_reason?: string | null
          bio?: string | null
          bubble_color?: string | null
          created_at?: string
          gender?: string | null
          gift_black_orchid?: number
          gift_diamond?: number
          gift_heart?: number
          gift_plushie?: number
          id?: string
          is_admin?: boolean
          is_banned?: boolean
          is_jailed?: boolean | null
          is_muted?: boolean | null
          is_online?: boolean | null
          is_premium?: boolean | null
          jail_expires_at?: string | null
          last_active_at?: string | null
          points?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      purchased_bubble_colors: {
        Row: {
          color_id: string
          id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          color_id: string
          id?: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          color_id?: string
          id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchased_bubble_colors_color_id_fkey"
            columns: ["color_id"]
            isOneToOne: false
            referencedRelation: "bubble_colors"
            referencedColumns: ["id"]
          },
        ]
      }
      reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_note: string | null
          created_at: string
          id: string
          reason: string
          reported_comment_id: string | null
          reported_post_id: string | null
          reported_user_id: string | null
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reported_user_id?: string | null
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_comment_id_fkey"
            columns: ["reported_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          icon_url: string
          id: string
          name: string
          price: number
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          icon_url: string
          id?: string
          name: string
          price: number
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          icon_url?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      sticker_pack_stickers: {
        Row: {
          created_at: string
          emoji: string
          id: string
          label: string
          pack_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          label?: string
          pack_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          label?: string
          pack_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sticker_pack_stickers_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
      sticker_packs: {
        Row: {
          created_at: string
          icon_url: string
          id: string
          is_free: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          icon_url?: string
          id?: string
          is_free?: boolean
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          icon_url?: string
          id?: string
          is_free?: boolean
          name?: string
          price?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          created_at: string
          ends_at: string
          id: string
          payment_method: string
          starts_at: string
          status: Database["public"]["Enums"]["subscription_status"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          ends_at?: string
          id?: string
          payment_method?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          ends_at?: string
          id?: string
          payment_method?: string
          starts_at?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          id: string
          is_equipped: boolean
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_sticker_packs: {
        Row: {
          id: string
          pack_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          pack_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          pack_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sticker_packs_pack_id_fkey"
            columns: ["pack_id"]
            isOneToOne: false
            referencedRelation: "sticker_packs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_punish_user: {
        Args: {
          _action: string
          _admin_id: string
          _duration_minutes?: number
          _reason?: string
          _target_user_id: string
        }
        Returns: Json
      }
      check_and_clear_expired_punishments: { Args: never; Returns: undefined }
      check_profanity: { Args: { _text: string }; Returns: boolean }
      check_rate_limit: {
        Args: {
          _action: string
          _max_count: number
          _user_id: string
          _window_minutes: number
        }
        Returns: boolean
      }
      cleanup_old_messages: { Args: never; Returns: undefined }
      count_dm_messages: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: number
      }
      create_direct_conversation: {
        Args: { other_user_id: string }
        Returns: string
      }
      founder_demote_admin: {
        Args: { _founder_id: string; _target_user_id: string }
        Returns: Json
      }
      founder_promote_admin: {
        Args: { _founder_id: string; _target_user_id: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_conversation_member: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_banned: { Args: { _user_id: string }; Returns: boolean }
      purchase_bubble_color: { Args: { p_color_id: string }; Returns: Json }
      purchase_item: { Args: { p_item_id: string }; Returns: Json }
      purchase_sticker_pack: { Args: { p_pack_id: string }; Returns: Json }
      send_gift: {
        Args: {
          p_gift_type_id: string
          p_receiver_id: string
          p_sender_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      conversation_type: "direct" | "public_group" | "private_group"
      report_status: "pending" | "reviewed" | "dismissed" | "actioned"
      subscription_status: "active" | "expired" | "cancelled"
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
      app_role: ["admin", "moderator", "user"],
      conversation_type: ["direct", "public_group", "private_group"],
      report_status: ["pending", "reviewed", "dismissed", "actioned"],
      subscription_status: ["active", "expired", "cancelled"],
    },
  },
} as const

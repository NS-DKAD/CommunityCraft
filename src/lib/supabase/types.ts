import { ProjectCategory } from "@/types/project";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          slug: string;
          name: string;
          author_name: string;
          description: string;
          category: ProjectCategory;
          tags: string[];
          github_url: string | null;
          is_approved: boolean;
          moderation_status: "pending" | "approved" | "rejected";
          goal: string | null;
          status: string | null;
          source_type: string | null;
          source_verified: boolean | null;
          discussion_url: string | null;
          website_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          author_name: string;
          description: string;
          category: ProjectCategory;
          tags?: string[];
          github_url?: string | null;
          is_approved?: boolean;
          moderation_status?: "pending" | "approved" | "rejected";
          goal?: string | null;
          status?: string | null;
          source_type?: string | null;
          source_verified?: boolean | null;
          discussion_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          author_name?: string;
          description?: string;
          category?: ProjectCategory;
          tags?: string[];
          github_url?: string | null;
          is_approved?: boolean;
          moderation_status?: "pending" | "approved" | "rejected";
          goal?: string | null;
          status?: string | null;
          source_type?: string | null;
          source_verified?: boolean | null;
          discussion_url?: string | null;
          website_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_github_stats: {
        Row: {
          project_id: string;
          stars: number;
          forks: number;
          open_issues: number;
          license: string | null;
          default_branch: string;
          last_github_commit_at: string | null;
          synced_at: string;
        };
        Insert: {
          project_id: string;
          stars?: number;
          forks?: number;
          open_issues?: number;
          license?: string | null;
          default_branch?: string;
          last_github_commit_at?: string | null;
          synced_at?: string;
        };
        Update: {
          project_id?: string;
          stars?: number;
          forks?: number;
          open_issues?: number;
          license?: string | null;
          default_branch?: string;
          last_github_commit_at?: string | null;
          synced_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_github_stats_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: true;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      project_contribution_requests: {
        Row: {
          id: string;
          project_id: string;
          display_name: string;
          contact_type: string;
          contact: string;
          skills: string;
          contribution_type: string;
          message: string | null;
          status: string;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          display_name: string;
          contact_type: string;
          contact: string;
          skills: string;
          contribution_type: string;
          message?: string | null;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          display_name?: string;
          contact_type?: string;
          contact?: string;
          skills?: string;
          contribution_type?: string;
          message?: string | null;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_contribution_requests_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      project_reports: {
        Row: {
          id: string;
          project_id: string;
          reporter_name: string | null;
          reason: string;
          details: string | null;
          status: string;
          created_at: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          reporter_name?: string | null;
          reason: string;
          details?: string | null;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          reporter_name?: string | null;
          reason?: string;
          details?: string | null;
          status?: string;
          created_at?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "project_reports_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          }
        ];
      };
      admin_users: {
        Row: { user_id: string; added_at: string; added_by: string | null };
        Insert: { user_id: string; added_at?: string; added_by?: string | null };
        Update: { user_id?: string; added_at?: string; added_by?: string | null };
        Relationships: [];
      };
      moderation_events: {
        Row: {
          id: string;
          actor_id: string;
          entity_type: "project" | "contribution_request" | "project_report";
          entity_id: string;
          action: string;
          before_state: Json;
          after_state: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          actor_id: string;
          entity_type: "project" | "contribution_request" | "project_report";
          entity_id: string;
          action: string;
          before_state: Json;
          after_state: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          display_name: string | null;
          color: string | null;
          is_active: boolean;
          is_official: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          display_name?: string | null;
          color?: string | null;
          is_active?: boolean;
          is_official?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          display_name?: string | null;
          color?: string | null;
          is_active?: boolean;
          is_official?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tag_aliases: {
        Row: {
          id: string;
          alias: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          alias: string;
          tag_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          alias?: string;
          tag_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tag_aliases_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      project_tags: {
        Row: {
          project_id: string;
          tag_id: string;
        };
        Insert: {
          project_id: string;
          tag_id: string;
        };
        Update: {
          project_id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_tags_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          }
        ];
      };
      project_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          display_name: string | null;
          color: string | null;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          display_name?: string | null;
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          display_name?: string | null;
          color?: string | null;
          is_active?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      project_replacements: {
        Row: {
          id: string;
          project_id: string;
          application_id: string;
          replacement_level: "Complete" | "Partial" | "Specialized";
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          application_id: string;
          replacement_level: "Complete" | "Partial" | "Specialized";
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          application_id?: string;
          replacement_level?: "Complete" | "Partial" | "Specialized";
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "project_replacements_project_id_fkey";
            columns: ["project_id"];
            isOneToOne: false;
            referencedRelation: "projects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "project_replacements_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      projects_with_stats: {
        Row: {
          id: string;
          slug: string;
          name: string;
          author: string;
          description: string;
          category: ProjectCategory;
          tags: string[];
          githubUrl: string | null;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
          stars: number;
          forks: number;
          open_issues: number;
          license: string;
          last_github_commit_at: string | null;
          synced_at: string;
          goal: string | null;
          status: string | null;
          source_type: string | null;
          source_verified: boolean | null;
          discussion_url: string | null;
          website_url: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_communitycraft_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      admin_save_project: {
        Args: { p_project_id: string; p_fields: Json; p_moderation_status: "pending" | "approved" | "rejected" };
        Returns: undefined;
      };
      admin_update_contribution_request: {
        Args: { p_request_id: string; p_status: "new" | "reviewed" | "replied" | "dismissed" };
        Returns: undefined;
      };
      admin_update_project_report: {
        Args: { p_report_id: string; p_status: string };
        Returns: undefined;
      };
      admin_update_tag_presentation: {
        Args: { p_tag_id: string; p_display_name: string | null; p_color: string | null };
        Returns: undefined;
      };
      admin_create_project_category: {
        Args: { p_name: string; p_slug: string; p_display_name: string | null; p_color: string | null };
        Returns: string;
      };
      admin_update_project_category_presentation: {
        Args: { p_category_id: string; p_display_name: string | null; p_color: string | null; p_is_active: boolean };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

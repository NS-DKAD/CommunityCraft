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
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
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
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

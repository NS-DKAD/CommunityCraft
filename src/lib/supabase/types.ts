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
          github_url: string;
          is_approved: boolean;
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
          github_url: string;
          is_approved?: boolean;
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
          github_url?: string;
          is_approved?: boolean;
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
          githubUrl: string;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
          stars: number;
          forks: number;
          open_issues: number;
          license: string;
          last_github_commit_at: string | null;
          synced_at: string;
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

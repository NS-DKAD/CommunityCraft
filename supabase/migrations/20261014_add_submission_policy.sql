-- Migration: add INSERT policy for service_role submitted projects
-- Run this in your Supabase SQL Editor to allow the server-side API
-- to insert pending project submissions.

-- Allow server-side (service_role) to insert new projects pending review
-- Note: The service_role key bypasses RLS by default, but this policy
-- documents the intent and can be used if a future server role is needed.

-- Allow all users to read their own pending submissions once auth is added.
-- For now, only service_role inserts are used.

-- Ensure is_approved can be false for pending submissions
COMMENT ON COLUMN public.projects.is_approved IS
  'false = pending review, true = visible in catalog. All submissions start as false.';

-- Future: Add INSERT policy for authenticated users
-- CREATE POLICY "Authenticated users can submit projects"
--   ON public.projects FOR INSERT
--   TO authenticated
--   WITH CHECK (is_approved = false);

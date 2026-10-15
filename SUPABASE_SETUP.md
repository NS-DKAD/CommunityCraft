# Supabase Setup Guide for CommunityCraft

This guide walks you through setting up your free Supabase database step by step.

---

## 1. Create a Free Supabase Account & Project

1. Go to **[https://supabase.com](https://supabase.com)** and click **Start your project** (sign up with GitHub or an email).
2. On your Supabase dashboard, click **New project**.
3. Fill in the project details:
   - **Name**: `communitycraft` (or any name you prefer)
   - **Database Password**: Choose a strong password and save it somewhere secure.
   - **Region**: Choose a region closest to you or your target audience (e.g., *Frankfurt*, *Paris*, *London*).
   - **Pricing Plan**: Select the **Free** tier.
4. Click **Create new project** and wait 1 to 2 minutes while Supabase sets up your PostgreSQL database.

---

## 2. Run the Database Schema Migration

1. In your Supabase project dashboard, open the **SQL Editor** from the left-hand navigation bar (icon with `>_`).
2. Click **New query** (top left).
3. Open the file [`supabase/migrations/20261014_init_communitycraft_schema.sql`](./supabase/migrations/20261014_init_communitycraft_schema.sql) in your local editor.
4. Copy the entire contents of that file and paste it into the Supabase SQL Editor.
5. Click **Run** (green button at the bottom right).
   - You should see: `Success. No rows returned`.
   - This creates the `projects` table, the `project_github_stats` table, security rules (RLS), performance indexes, and the `projects_with_stats` view.

---

## 3. (Optional but Recommended) Populate Initial Projects

To populate your database with the initial demo projects:

1. In the Supabase **SQL Editor**, click **New query**.
2. Open [`supabase/seed.sql`](./supabase/seed.sql) in your local editor.
3. Copy the entire contents and paste it into the SQL Editor.
4. Click **Run**.
5. You can verify your data by clicking on **Table Editor** in the left menu and selecting `projects`.

---

## 4. Get Your API Credentials

1. In your Supabase dashboard, click on the **Project Settings** icon (gear icon at the bottom of the left sidebar).
2. Go to **API** under Configuration.
3. Locate the following two values:
   - **Project URL**: something like `https://abcdefghijklm.supabase.co`
   - **Project API keys** > `anon` / `public`: a long string starting with `eyJhb...`

> ⚠️ **Security Warning**: Never share the `service_role` key! The `service_role` key bypasses all Row Level Security and must **never** be used in client-side code or committed to Git. Only use the `anon` key.

---

## 5. Configure Your Local Environment

1. In the root of this project (`CommunityCraft/`), create a new file named `.env.local` (you can copy `.env.example`).
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

3. Save the `.env.local` file. Note that `.env.local` is already in `.gitignore` so your keys won't be pushed to Git.

---

## 6. Test Your Setup

Restart your local development server:

```powershell
npm run dev
```

Visit **http://localhost:3000**:
- If Supabase is connected, the top banner will show a green confirmation: **Live Database Connected**.
- If `.env.local` is missing or not configured, the website automatically stays in **Demo Data Mode** without crashing.

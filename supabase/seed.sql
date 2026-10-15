-- Seed data for CommunityCraft (PostgreSQL / Supabase)
-- Populates initial projects and their associated GitHub statistics

-- 1. Insert Projects
INSERT INTO public.projects (id, slug, name, author_name, description, category, tags, github_url)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'artcraft-studio-tools',
    'ArtCraft Studio Tools',
    'artcraft-community',
    'A suite of CLI and GUI utilities to inspect, validate, and export 3D assets and textures compatible with the ArtCraft engine.',
    'Tools',
    ARRAY['cli', 'gui', 'export', '3d', 'pipeline'],
    'https://github.com/example/artcraft-studio-tools'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'voxel-enhanced-mod',
    'Voxel Enhanced Mod',
    'VoxelCrafter',
    'A community mod adding dynamic biomes, an advanced weather system, and enriched physical interactions.',
    'Mods',
    ARRAY['biomes', 'weather', 'gameplay', 'voxels'],
    'https://github.com/example/voxel-enhanced-mod'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'cel-shaded-artcraft',
    'Cel-Shaded Lighting Pack',
    'PixelForge',
    'Custom anime-style cel-shaded shader pack featuring adjustable outlines and dynamic ambient lighting.',
    'Shaders',
    ARRAY['shaders', 'cel-shading', 'post-process', 'glsl'],
    'https://github.com/example/cel-shaded-artcraft'
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'artcraft-assets-pbr',
    'PBR Materials & Foliage Pack',
    'NatureArtLab',
    'Open collection of 2K PBR textures, optimized foliage models, and rock materials ready for procedural world generation.',
    'Rendering & Assets',
    ARRAY['textures', 'pbr', 'foliage', 'procedural'],
    'https://github.com/example/artcraft-assets-pbr'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'artcraft-network-lib',
    'ArtCraft Network SDK',
    'NetCraftTeam',
    'TypeScript and Node.js networking library to streamline multiplayer synchronization, room events, and packet serialization.',
    'Libraries',
    ARRAY['multiplayer', 'sdk', 'networking', 'typescript'],
    'https://github.com/example/artcraft-network-lib'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'blueprint-visual-script',
    'Visual Blueprint Editor',
    'CodelessDev',
    'Visual node-based script editor enabling creators to design quests and gameplay mechanics without coding.',
    'Tools',
    ARRAY['visual-scripting', 'nodes', 'editor', 'modding'],
    'https://github.com/example/blueprint-visual-script'
  )
ON CONFLICT (id) DO NOTHING;

-- 2. Insert GitHub Stats (separated from project manual details)
INSERT INTO public.project_github_stats (project_id, stars, forks, open_issues, license, default_branch, synced_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 142, 18, 3, 'MIT', 'main', '2026-09-18 12:00:00+00'),
  ('00000000-0000-0000-0000-000000000002', 389, 45, 7, 'GPL-3.0', 'main', '2026-10-02 15:30:00+00'),
  ('00000000-0000-0000-0000-000000000003', 215, 29, 2, 'Apache-2.0', 'main', '2026-08-30 09:15:00+00'),
  ('00000000-0000-0000-0000-000000000004', 97, 12, 1, 'CC-BY-4.0', 'main', '2026-09-24 18:45:00+00'),
  ('00000000-0000-0000-0000-000000000005', 76, 8, 4, 'MIT', 'main', '2026-10-10 11:20:00+00'),
  ('00000000-0000-0000-0000-000000000006', 184, 22, 5, 'MIT', 'main', '2026-10-12 14:10:00+00')
ON CONFLICT (project_id) DO NOTHING;

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

const envLocalPath = path.resolve(process.cwd(), ".env.local");

console.log("🔍 Diagnostic de connexion CommunityCraft -> Supabase...\n");

// 1. Verify .env.local file existence
if (!fs.existsSync(envLocalPath)) {
  console.error("❌ Fichier .env.local introuvable à la racine du projet.");
  console.log("👉 Créez le fichier .env.local à la racine du projet avec vos clés Supabase.");
  console.log("   (Consultez SUPABASE_SETUP.md pour les instructions détaillées).\n");
  process.exit(1);
}

try {
  process.loadEnvFile(envLocalPath);
} catch (e) {
  console.error("❌ Erreur de lecture du fichier .env.local :", e.message);
  process.exit(1);
}

// 2. Validate environment variables
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  console.error("❌ Variables d'environnement manquantes dans .env.local :");
  if (!url) console.error("   - NEXT_PUBLIC_SUPABASE_URL est absent ou vide.");
  if (!anonKey) console.error("   - NEXT_PUBLIC_SUPABASE_ANON_KEY est absent ou vide.");
  console.log("\n👉 Renseignez les deux variables dans .env.local et réessayez.\n");
  process.exit(1);
}

if (
  url.includes("your-project-id") ||
  url.includes("your-project-ref") ||
  anonKey.includes("your-anon-public-key")
) {
  console.error("❌ Valeurs d'exemples détectées dans .env.local.");
  console.log("👉 Remplacez les valeurs par défaut par vos vraies clés issues du tableau de bord Supabase.\n");
  process.exit(1);
}

if (!url.startsWith("https://") || !url.includes(".supabase.co")) {
  console.warn("⚠️ Attention : NEXT_PUBLIC_SUPABASE_URL ne respecte pas le format habituel (https://<ref>.supabase.co).");
}

if (!anonKey.startsWith("eyJ")) {
  console.warn("⚠️ Attention : NEXT_PUBLIC_SUPABASE_ANON_KEY ne ressemble pas à un jeton JWT Supabase (doit commencer par 'eyJ').");
}

// 3. Test client initialization and query
try {
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false },
  });

  console.log("📡 Envoi d'une requête test vers la base Supabase...");
  const { data, error } = await supabase
    .from("projects_with_stats")
    .select("id, name, category, stars")
    .order("stars", { ascending: false });

  if (error) {
    console.error(`\n❌ La requête a échoué : ${error.message} (code: ${error.code || "inconnu"})`);

    if (error.code === "42P01" || error.message.includes("relation") || error.message.includes("does not exist")) {
      console.log("\n💡 Cause : La table ou vue 'projects_with_stats' n'existe pas encore dans Supabase.");
      console.log("👉 Résolution : Rendez-vous dans le SQL Editor de Supabase et exécutez :");
      console.log("   1. supabase/migrations/20261014_init_communitycraft_schema.sql");
      console.log("   2. (Optionnel) supabase/seed.sql\n");
    } else if (error.code === "PGRST301" || error.message.includes("JWT") || error.message.includes("apikey")) {
      console.log("\n💡 Cause : Clé API incorrecte ou rejetée.");
      console.log("👉 Résolution : Vérifiez votre clé 'anon public' dans Project Settings -> API.\n");
    } else {
      console.log("\n💡 Vérifiez les paramètres de votre projet Supabase et votre connexion internet.\n");
    }
    process.exit(1);
  }

  console.log(`\n✅ Connexion à Supabase réussie avec succès !`);
  console.log(`📊 ${data.length} projet(s) trouvé(s) dans la base.`);

  if (data.length === 0) {
    console.log("ℹ️ La base est connectée mais actuellement vide. Pour insérer les projets d'exemples, exécutez supabase/seed.sql dans le SQL Editor Supabase.\n");
  } else {
    console.log("Aperçu des premiers enregistrements récupérés :");
    data.slice(0, 3).forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} [${p.category}] - ⭐ ${p.stars} étoiles`);
    });
    console.log("\n🎉 La base de données en direct est 100 % opérationnelle !\n");
  }
} catch (err) {
  console.error("\n❌ Erreur inattendue :", err.message || err);
  process.exit(1);
}

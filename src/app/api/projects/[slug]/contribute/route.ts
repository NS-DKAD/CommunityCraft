import { NextRequest, NextResponse } from "next/server";
import { validateContributionRequestInput } from "@/lib/submission";
import { getSupabaseServiceClient, isServiceClientConfigured } from "@/lib/supabase/server-client";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = RATE_LIMIT_MAP.get(ip);

  if (!entry || now > entry.resetAt) {
    RATE_LIMIT_MAP.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count += 1;
  return true;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  if (!isServiceClientConfigured()) {
    return NextResponse.json(
      {
        error: "Contribution requests are not yet enabled on this instance.",
      },
      { status: 503 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before sending another contribution request." },
      { status: 429 }
    );
  }

  const { slug } = await params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body. Expected JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Request body must be a JSON object." }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const validation = validateContributionRequestInput({
    displayName: typeof payload.displayName === "string" ? payload.displayName : undefined,
    contactType: typeof payload.contactType === "string" ? payload.contactType : undefined,
    contact: typeof payload.contact === "string" ? payload.contact : undefined,
    skills: typeof payload.skills === "string" ? payload.skills : undefined,
    contributionType: typeof payload.contributionType === "string" ? payload.contributionType : undefined,
    message: typeof payload.message === "string" ? payload.message : undefined,
  });

  if (!validation.valid) {
    return NextResponse.json(
      { error: "Validation failed.", fieldErrors: validation.errors },
      { status: 422 }
    );
  }

  const supabase = getSupabaseServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database connection is unavailable." }, { status: 503 });
  }

  const projectId = typeof payload.projectId === "string" ? payload.projectId : null;

  const { data: project, error: projectError } = projectId
    ? await supabase.from("projects").select("id").eq("id", projectId).maybeSingle()
    : await supabase.from("projects").select("id").eq("slug", slug).maybeSingle();

  if (projectError) {
    console.error("[projects/contribute] Failed to resolve project:", projectError.message);
    return NextResponse.json({ error: "Failed to resolve the project." }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { error: insertError } = await supabase.from("project_contribution_requests").insert({
    project_id: project.id,
    display_name: String(payload.displayName).trim(),
    contact_type: String(payload.contactType).trim(),
    contact: String(payload.contact).trim(),
    skills: String(payload.skills).trim(),
    contribution_type: String(payload.contributionType).trim(),
    message: typeof payload.message === "string" && payload.message.trim() ? payload.message.trim() : null,
    status: "new",
  });

  if (insertError) {
    console.error("[projects/contribute] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Unable to save contribution request." }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Your contribution request has been recorded and will be reviewed by the project maintainer or a moderator.",
    },
    { status: 201 }
  );
}

import { NextRequest, NextResponse } from "next/server";
import { validateProjectReportInput } from "@/lib/submission";
import { getSupabaseServiceClient, isServiceClientConfigured } from "@/lib/supabase/server-client";

const RATE_LIMIT_MAP = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;

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
        error: "Reports are not yet enabled on this instance.",
      },
      { status: 503 }
    );
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many reports submitted from this IP. Please wait a moment." },
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
  const validation = validateProjectReportInput({
    reporterName: typeof payload.reporterName === "string" ? payload.reporterName : undefined,
    reason: typeof payload.reason === "string" ? payload.reason : undefined,
    details: typeof payload.details === "string" ? payload.details : undefined,
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
    console.error("[projects/report] Failed to resolve project:", projectError.message);
    return NextResponse.json({ error: "Failed to resolve the project." }, { status: 500 });
  }

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const { error: insertError } = await supabase.from("project_reports").insert({
    project_id: project.id,
    reporter_name: typeof payload.reporterName === "string" && payload.reporterName.trim() ? payload.reporterName.trim() : null,
    reason: String(payload.reason).trim(),
    details: typeof payload.details === "string" && payload.details.trim() ? payload.details.trim() : null,
    status: "open",
  });

  if (insertError) {
    console.error("[projects/report] Insert failed:", insertError.message);
    return NextResponse.json({ error: "Unable to save the report." }, { status: 500 });
  }

  return NextResponse.json(
    {
      message: "Your report has been recorded and will be reviewed by a moderator.",
    },
    { status: 201 }
  );
}

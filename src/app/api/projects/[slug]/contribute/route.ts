import { NextRequest, NextResponse } from "next/server";
import { validateContributionRequestInput } from "@/lib/submission";
import { getSupabaseServiceClient, isServiceClientConfigured } from "@/lib/supabase/server-client";
import { sendResendEmail, maskContact } from "@/lib/notifications";

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

  // The database is the source of truth. An email failure must not encourage a
  // duplicate submission; the request remains available in the admin inbox.
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  let notificationStatus: "sent" | "pending" | "not_configured" = "not_configured";

  if (adminEmail && resendApiKey) {
    notificationStatus = "sent";
    // Build a minimal, non-sensitive email body. Mask the contact details in the email
    // and indicate that full contact is stored in the database for reviewers.
    const masked = maskContact(String(payload.contact).trim(), String(payload.contactType).trim());
    const subject = `[CommunityCraft] New contribution interest: ${project.id}`;
    const text = `A new contribution request was submitted for project ${project.id}.

Display name: ${String(payload.displayName).trim()}
Contact type: ${String(payload.contactType).trim()}
Contact (masked): ${masked}
Skills: ${String(payload.skills).trim()}
Contribution type: ${String(payload.contributionType).trim()}

Message (truncated): ${
      (typeof payload.message === 'string' && payload.message.trim()) ? String(payload.message).trim().slice(0, 600) : '(none)'
    }

Full contact details and the full message are stored in the review table in the database.
`;

    // Deterministic idempotency key to reduce duplicate notifications on retries
    const idempotencyKey = Buffer.from(
      `${project.id}|${String(payload.displayName).trim()}|${String(payload.contact).trim()}|${String(payload.skills).trim()}|${String(payload.contributionType).trim()}`
    ).toString('base64');

    let notificationSent = false;
    let notificationHttpStatus = 0;
    try {
      const sendResult = await sendResendEmail({
        to: adminEmail,
        subject,
        text,
        idempotencyKey,
      });
      notificationSent = sendResult.ok;
      notificationHttpStatus = sendResult.status;
    } catch (error) {
      console.error("[projects/contribute] Notification delivery threw after request was saved", {
        errorType: error instanceof Error ? error.name : "unknown",
      });
    }

    if (!notificationSent) {
      notificationStatus = "pending";
      console.error("[projects/contribute] Notification delivery failed after request was saved", {
        status: notificationHttpStatus,
      });
    }
  }

  return NextResponse.json(
    {
      message: "Your contribution request has been recorded and will be reviewed by the project maintainer or a moderator.",
      notificationStatus,
    },
    { status: 201 }
  );
}

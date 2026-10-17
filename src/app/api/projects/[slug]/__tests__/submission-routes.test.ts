import { NextRequest } from "next/server";
import { POST as contribute } from "../contribute/route";
import { POST as report } from "../report/route";
import { getSupabaseServiceClient, isServiceClientConfigured } from "@/lib/supabase/server-client";
import { sendResendEmail } from "@/lib/notifications";

jest.mock("@/lib/supabase/server-client", () => ({
  getSupabaseServiceClient: jest.fn(),
  isServiceClientConfigured: jest.fn(),
}));
jest.mock("@/lib/notifications", () => ({
  sendResendEmail: jest.fn(),
  maskContact: jest.fn(() => "m***@example.com"),
}));

const contributionPayload = {
  projectId: "project-1",
  displayName: "Contributor",
  contactType: "email",
  contact: "person@example.com",
  skills: "Testing",
  contributionType: "testing",
};

describe("project submission routes", () => {
  const projectLookup = { data: { id: "project-1" }, error: null };
  let insert: jest.Mock;
  let from: jest.Mock;

  beforeEach(() => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "admin@example.com";
    process.env.RESEND_API_KEY = "test-key";
    (isServiceClientConfigured as jest.Mock).mockReturnValue(true);
    insert = jest.fn().mockResolvedValue({ error: null });
    from = jest.fn((table: string) => table === "projects"
      ? { select: () => ({ eq: () => ({ maybeSingle: async () => projectLookup }) }) }
      : { insert });
    (getSupabaseServiceClient as jest.Mock).mockReturnValue({ from });
    (sendResendEmail as jest.Mock).mockResolvedValue({ ok: true, status: 200, body: null });
  });

  afterEach(() => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.RESEND_API_KEY;
    jest.clearAllMocks();
  });

  test("reports a database save failure without claiming the report was recorded", async () => {
    insert.mockResolvedValue({ error: { message: "database unavailable" } });
    const request = new NextRequest("http://localhost/api/projects/demo/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "project-1", reason: "spam" }),
    });

    const response = await report(request, { params: Promise.resolve({ slug: "demo" }) });
    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "Unable to save the report." });
  });

  test("confirms a report only after its database insert succeeds", async () => {
    const request = new NextRequest("http://localhost/api/projects/demo/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ projectId: "project-1", reason: "spam" }),
    });

    const response = await report(request, { params: Promise.resolve({ slug: "demo" }) });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ project_id: "project-1", status: "open" }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ message: "Your report has been recorded and will be reviewed by a moderator." });
  });

  test("keeps a saved collaboration request successful when the notification provider fails", async () => {
    (sendResendEmail as jest.Mock).mockResolvedValue({ ok: false, status: 503, body: { error: "provider unavailable" } });
    const request = new NextRequest("http://localhost/api/projects/demo/contribute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contributionPayload),
    });

    const response = await contribute(request, { params: Promise.resolve({ slug: "demo" }) });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ notificationStatus: "pending" });
  });

  test("does not claim success when a collaboration request could not be saved", async () => {
    insert.mockResolvedValue({ error: { message: "database unavailable" } });
    const request = new NextRequest("http://localhost/api/projects/demo/contribute", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(contributionPayload),
    });

    const response = await contribute(request, { params: Promise.resolve({ slug: "demo" }) });
    expect(response.status).toBe(500);
    expect(sendResendEmail).not.toHaveBeenCalled();
  });
});

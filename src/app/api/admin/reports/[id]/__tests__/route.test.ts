import { NextRequest } from "next/server";
import { PATCH } from "../route";
import { authorizeAdminApi } from "@/lib/admin/authorization";

jest.mock("@/lib/admin/authorization", () => ({ authorizeAdminApi: jest.fn() }));

describe("admin project report status route", () => {
  const rpc = jest.fn();
  const reportId = "123e4567-e89b-42d3-a456-426614174000";

  beforeEach(() => {
    rpc.mockResolvedValue({ error: null });
    (authorizeAdminApi as jest.Mock).mockResolvedValue({ ok: true, supabase: { rpc }, userId: "admin-1" });
  });

  afterEach(() => jest.clearAllMocks());

  test("persists an allowed status through the audited admin RPC", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
      body: JSON.stringify({ status: "reviewed" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: reportId }) });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("admin_update_project_report", { p_report_id: reportId, p_status: "reviewed" });
  });

  test("rejects unknown report statuses before the database call", async () => {
    const request = new NextRequest(`http://localhost/api/admin/reports/${reportId}`, {
      method: "PATCH",
      headers: { origin: "http://localhost", host: "localhost", "content-type": "application/json" },
      body: JSON.stringify({ status: "deleted" }),
    });

    const response = await PATCH(request, { params: Promise.resolve({ id: reportId }) });
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});

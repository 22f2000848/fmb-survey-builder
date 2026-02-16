import { describe, expect, it } from "vitest";

import { GET as healthGet } from "../../src/app/api/health/route";
import { POST as adminCreateState } from "../../src/app/api/admin/states/route";
import { GET as datasetsGet } from "../../src/app/api/datasets/route";

describe("API route hardening", () => {
  it("returns healthy status", async () => {
    const response = await healthGet();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "ok"
    });
  });

  it("requires auth for admin state creation", async () => {
    const request = new Request("http://localhost/api/admin/states", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        code: "CG",
        name: "Chhattisgarh"
      })
    });

    const response = await adminCreateState(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized"
    });
  });

  it("requires auth for dataset listing", async () => {
    const request = new Request("http://localhost/api/datasets", {
      method: "GET"
    });
    const response = await datasetsGet(request);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      error: "Unauthorized"
    });
  });
});

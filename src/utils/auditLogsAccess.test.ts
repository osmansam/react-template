import { describe, expect, it } from "vitest";
import { canAccessAuditLogs } from "./auditLogsAccess";

describe("canAccessAuditLogs", () => {
  it("allows any authenticated user when authorization is disabled", () => {
    expect(
      canAccessAuditLogs({ isAuthorized: false, authorizeRole: [] }, { role: "role-a" }),
    ).toBe(true);
  });

  it("allows users whose role id is authorized", () => {
    expect(
      canAccessAuditLogs(
        { isAuthorized: true, authorizeRole: ["role-a", "role-b"] },
        { role: "role-b" },
      ),
    ).toBe(true);
  });

  it("allows users when an authorized role id is in roles array", () => {
    expect(
      canAccessAuditLogs(
        { isAuthorized: true, authorizeRole: ["role-a", "role-b"] },
        { roles: ["role-c", "role-b"] },
      ),
    ).toBe(true);
  });

  it("allows users whose role name matches an expanded authorized role name", () => {
    expect(
      canAccessAuditLogs(
        {
          isAuthorized: true,
          authorizeRole: ["role-id-a"],
          authorizeRoleNames: ["manager"],
        },
        { role: "manager" },
      ),
    ).toBe(true);
  });

  it("denies users whose role id is not authorized", () => {
    expect(
      canAccessAuditLogs(
        { isAuthorized: true, authorizeRole: ["role-a"] },
        { role: "role-b" },
      ),
    ).toBe(false);
  });
});

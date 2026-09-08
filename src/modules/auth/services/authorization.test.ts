import { describe, it, expect } from "vitest";
import { hasPermission, hasAnyPermission, getAccessibleBranchIds, type AccessProfile } from "./authorization.service";

const BRANCH_A = "branch-a";
const BRANCH_B = "branch-b";

function profile(...grants: AccessProfile["grants"]): AccessProfile {
  return { grants };
}

describe("hasPermission", () => {
  it("grants a branch-scoped permission when the branch matches", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["orders.read"]) });
    expect(hasPermission(p, "orders", "read", BRANCH_A)).toBe(true);
  });

  it("denies a branch-scoped permission when the branch does not match", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["orders.read"]) });
    expect(hasPermission(p, "orders", "read", BRANCH_B)).toBe(false);
  });

  it("denies a branch-scoped grant when no branchId is supplied at all", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["orders.read"]) });
    expect(hasPermission(p, "orders", "read")).toBe(false);
  });

  it("grants a global (branchId = null) permission for any branch", () => {
    const p = profile({ branchId: null, permissions: new Set(["orders.read"]) });
    expect(hasPermission(p, "orders", "read", BRANCH_A)).toBe(true);
    expect(hasPermission(p, "orders", "read", BRANCH_B)).toBe(true);
  });

  it("denies a permission the profile was never granted", () => {
    const p = profile({ branchId: null, permissions: new Set(["orders.read"]) });
    expect(hasPermission(p, "orders", "refund", BRANCH_A)).toBe(false);
  });

  it("checks across multiple grants, not just the first", () => {
    const p = profile(
      { branchId: BRANCH_A, permissions: new Set(["orders.read"]) },
      { branchId: BRANCH_B, permissions: new Set(["orders.refund"]) }
    );
    expect(hasPermission(p, "orders", "refund", BRANCH_B)).toBe(true);
    expect(hasPermission(p, "orders", "refund", BRANCH_A)).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  it("ignores branch scope entirely — a branch-scoped grant is sufficient", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["delivery.assign"]) });
    expect(hasAnyPermission(p, "delivery", "assign")).toBe(true);
  });

  it("still denies a permission that was never granted anywhere", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["delivery.assign"]) });
    expect(hasAnyPermission(p, "delivery", "read")).toBe(false);
  });

  it("returns false for a profile with no grants at all", () => {
    expect(hasAnyPermission(profile(), "orders", "read")).toBe(false);
  });
});

describe("getAccessibleBranchIds", () => {
  it("returns 'ALL' when any grant is global", () => {
    const p = profile(
      { branchId: BRANCH_A, permissions: new Set(["inventory.read"]) },
      { branchId: null, permissions: new Set(["inventory.read"]) }
    );
    expect(getAccessibleBranchIds(p, "inventory", "read")).toBe("ALL");
  });

  it("collects every branch-scoped grant when nothing is global", () => {
    const p = profile(
      { branchId: BRANCH_A, permissions: new Set(["inventory.read"]) },
      { branchId: BRANCH_B, permissions: new Set(["inventory.read"]) }
    );
    expect(getAccessibleBranchIds(p, "inventory", "read")).toEqual([BRANCH_A, BRANCH_B]);
  });

  it("excludes branches where the grant doesn't include this permission", () => {
    const p = profile(
      { branchId: BRANCH_A, permissions: new Set(["inventory.read"]) },
      { branchId: BRANCH_B, permissions: new Set(["orders.read"]) }
    );
    expect(getAccessibleBranchIds(p, "inventory", "read")).toEqual([BRANCH_A]);
  });

  it("returns an empty array when the profile has no matching grants", () => {
    const p = profile({ branchId: BRANCH_A, permissions: new Set(["orders.read"]) });
    expect(getAccessibleBranchIds(p, "inventory", "read")).toEqual([]);
  });
});

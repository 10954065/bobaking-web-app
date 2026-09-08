import { describe, it, expect } from "vitest";
import { resolveDateRange, resolveBranchFilter, round2 } from "./filters";

describe("resolveDateRange", () => {
  it("defaults to 30 days when no range param is given", () => {
    const { days, rangeParam } = resolveDateRange(undefined);
    expect(days).toBe(30);
    expect(rangeParam).toBe("30");
  });

  it("falls back to 30 days for an unrecognized value", () => {
    expect(resolveDateRange("999").days).toBe(30);
  });

  it("accepts 7 and 90 as valid presets", () => {
    expect(resolveDateRange("7").days).toBe(7);
    expect(resolveDateRange("90").days).toBe(90);
  });

  it("sets `to` to the start of tomorrow (UTC) and `from` exactly N days before it", () => {
    const { from, to, days } = resolveDateRange("7");
    const spanMs = to.getTime() - from.getTime();
    expect(spanMs).toBe(days * 24 * 60 * 60 * 1000);
    expect(to.getUTCHours()).toBe(0);
    expect(to.getUTCMinutes()).toBe(0);
  });
});

describe("resolveBranchFilter", () => {
  it("returns 'ALL' when the viewer has global access and no branch param is given", () => {
    expect(resolveBranchFilter("ALL", undefined)).toBe("ALL");
  });

  it("narrows to a single branch when a viewer with global access picks one", () => {
    expect(resolveBranchFilter("ALL", "branch-1")).toEqual(["branch-1"]);
  });

  it("narrows a multi-branch viewer down to the requested branch when it's in scope", () => {
    expect(resolveBranchFilter(["branch-1", "branch-2"], "branch-2")).toEqual(["branch-2"]);
  });

  it("falls back to the full accessible set when the requested branch is out of scope", () => {
    expect(resolveBranchFilter(["branch-1", "branch-2"], "branch-99")).toEqual(["branch-1", "branch-2"]);
  });

  it("falls back to the full accessible set when no branch param is given", () => {
    expect(resolveBranchFilter(["branch-1", "branch-2"], undefined)).toEqual(["branch-1", "branch-2"]);
  });
});

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(19.999)).toBe(20);
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(10.005)).toBe(10.01);
  });
});

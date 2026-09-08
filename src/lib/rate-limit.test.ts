import { describe, it, expect, vi, beforeEach } from "vitest";

const incr = vi.fn();
const expireMock = vi.fn();
const headersGet = vi.fn();

vi.mock("@/lib/redis", () => ({
  getRedisPublisher: () => ({ incr, expire: expireMock }),
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: headersGet }),
}));

const { enforceRateLimit, getRequestIp, RateLimitError } = await import("./rate-limit");

beforeEach(() => {
  incr.mockReset();
  expireMock.mockReset();
  headersGet.mockReset();
});

describe("enforceRateLimit", () => {
  it("allows the request and sets an expiry on the first hit in a window", async () => {
    incr.mockResolvedValue(1);
    await enforceRateLimit("test-key", { limit: 5, windowSeconds: 60 });
    expect(expireMock).toHaveBeenCalledWith("ratelimit:test-key", 60);
  });

  it("allows subsequent requests under the limit without resetting the expiry", async () => {
    incr.mockResolvedValue(3);
    await enforceRateLimit("test-key", { limit: 5, windowSeconds: 60 });
    expect(expireMock).not.toHaveBeenCalled();
  });

  it("throws RateLimitError once the count exceeds the limit", async () => {
    incr.mockResolvedValue(6);
    await expect(enforceRateLimit("test-key", { limit: 5, windowSeconds: 60 })).rejects.toThrow(RateLimitError);
  });

  it("allows a request exactly at the limit", async () => {
    incr.mockResolvedValue(5);
    await expect(enforceRateLimit("test-key", { limit: 5, windowSeconds: 60 })).resolves.toBeUndefined();
  });
});

describe("getRequestIp", () => {
  it("prefers the first address in a comma-separated x-forwarded-for", async () => {
    headersGet.mockImplementation((key: string) => (key === "x-forwarded-for" ? "1.2.3.4, 5.6.7.8" : null));
    expect(await getRequestIp()).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", async () => {
    headersGet.mockImplementation((key: string) => (key === "x-real-ip" ? "9.9.9.9" : null));
    expect(await getRequestIp()).toBe("9.9.9.9");
  });

  it("falls back to 'unknown' when neither header is present", async () => {
    headersGet.mockReturnValue(null);
    expect(await getRequestIp()).toBe("unknown");
  });
});

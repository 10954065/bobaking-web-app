import { describe, it, expect } from "vitest";
import { canTransition, nextValidStatuses, isTerminalStatus } from "./order-state-machine";

describe("canTransition", () => {
  it("allows a DRAFT order to move to PENDING_PAYMENT", () => {
    expect(canTransition("DRAFT", "PENDING_PAYMENT")).toBe(true);
  });

  it("allows a DRAFT order to skip straight to CONFIRMED (cash-at-counter path)", () => {
    expect(canTransition("DRAFT", "CONFIRMED")).toBe(true);
  });

  it("rejects skipping from DRAFT straight to DELIVERED", () => {
    expect(canTransition("DRAFT", "DELIVERED")).toBe(false);
  });

  it("rejects moving backwards from PREPARING to ACCEPTED", () => {
    expect(canTransition("PREPARING", "ACCEPTED")).toBe(false);
  });

  it("allows READY to skip the rider flow straight to COMPLETED (pickup/dine-in)", () => {
    expect(canTransition("READY", "COMPLETED")).toBe(true);
  });

  it("allows READY to enter the delivery flow via ASSIGNED_TO_RIDER", () => {
    expect(canTransition("READY", "ASSIGNED_TO_RIDER")).toBe(true);
  });

  it("rejects any transition out of REJECTED", () => {
    expect(canTransition("REJECTED", "CANCELLED")).toBe(false);
    expect(canTransition("REJECTED", "CONFIRMED")).toBe(false);
  });

  it("rejects any transition out of REFUNDED", () => {
    expect(canTransition("REFUNDED", "COMPLETED")).toBe(false);
  });

  it("allows a completed order to be refunded", () => {
    expect(canTransition("COMPLETED", "REFUNDED")).toBe(true);
  });

  it("allows a cancelled order to be refunded (e.g. a cash refund after cancellation)", () => {
    expect(canTransition("CANCELLED", "REFUNDED")).toBe(true);
  });

  it("rejects transitioning a status to itself", () => {
    expect(canTransition("PREPARING", "PREPARING")).toBe(false);
  });
});

describe("nextValidStatuses", () => {
  it("returns every outgoing edge for a mid-flow status", () => {
    expect(nextValidStatuses("CONFIRMED")).toEqual(["ACCEPTED", "REJECTED", "CANCELLED"]);
  });

  it("returns an empty array for a terminal status", () => {
    expect(nextValidStatuses("REFUNDED")).toEqual([]);
  });
});

describe("isTerminalStatus", () => {
  it("flags REFUNDED and REJECTED as terminal", () => {
    expect(isTerminalStatus("REFUNDED")).toBe(true);
    expect(isTerminalStatus("REJECTED")).toBe(true);
  });

  it("does not flag an in-flight status as terminal", () => {
    expect(isTerminalStatus("PREPARING")).toBe(false);
    expect(isTerminalStatus("COMPLETED")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import {
  handleWebSocketVisibilityChange,
  shouldHandleDynamicInvalidation,
} from "./useWebSocket";

describe("handleWebSocketVisibilityChange", () => {
  it("does nothing when the visible tab already has an open socket", () => {
    const reconnect = vi.fn();

    handleWebSocketVisibilityChange({
      visibilityState: "visible",
      socketReadyState: WebSocket.OPEN,
      reconnect,
    });

    expect(reconnect).not.toHaveBeenCalled();
  });

  it("requests a reconnect when the visible tab has no open socket", () => {
    const reconnect = vi.fn();

    handleWebSocketVisibilityChange({
      visibilityState: "visible",
      socketReadyState: WebSocket.CLOSED,
      reconnect,
    });

    expect(reconnect).toHaveBeenCalledOnce();
  });
});

describe("shouldHandleDynamicInvalidation", () => {
  it("ignores the current user's event because the mutation already invalidates locally", () => {
    expect(shouldHandleDynamicInvalidation("user-1", "user-1")).toBe(false);
  });

  it("handles events from other users and external writers", () => {
    expect(shouldHandleDynamicInvalidation("user-2", "user-1")).toBe(true);
    expect(shouldHandleDynamicInvalidation(undefined, "user-1")).toBe(true);
  });
});

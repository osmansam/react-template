import { describe, expect, it, vi } from "vitest";
import { handleWebSocketVisibilityChange } from "./useWebSocket";

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

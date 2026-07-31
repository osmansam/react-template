import { beforeEach, describe, expect, it, vi } from "vitest";

const axiosClientMock = vi.hoisted(() => ({
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("./axiosClient", () => ({ axiosClient: axiosClientMock }));

import { patch, put, remove } from ".";

describe("API mutation helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["put", put, axiosClientMock.put, { path: "/items/1", payload: { name: "Updated" } }],
    ["patch", patch, axiosClientMock.patch, { path: "/items/1", payload: { name: "Updated" } }],
  ] as const)("returns the %s response payload", async (_name, request, clientMethod, input) => {
    const payload = { id: 1, name: "Updated" };
    clientMethod.mockResolvedValue({ data: payload, status: 200 });

    await expect(request<typeof input.payload, typeof payload>(input)).resolves.toEqual(payload);
  });

  it("returns the delete response payload", async () => {
    const payload = { id: 1, deleted: true };
    axiosClientMock.delete.mockResolvedValue({ data: payload, status: 200 });

    await expect(remove<typeof payload>({ path: "/items/1" })).resolves.toEqual(payload);
  });
});

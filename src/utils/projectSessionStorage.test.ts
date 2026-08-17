import { describe, expect, it } from "vitest";
import { projectSessionStorageKey } from "./projectSessionStorage";

describe("projectSessionStorageKey", () => {
  it("isolates the same metadata for different projects", () => {
    expect(projectSessionStorageKey("user", "/t/davinci/p/goblin/catalog")).not.toBe(
      projectSessionStorageKey("user", "/t/davinci/p/phoenix/catalog"),
    );
  });

  it("normalizes slugs and returns no key outside project routes", () => {
    expect(projectSessionStorageKey("user", "/t/DAVINCI/p/GOBLIN/catalog")).toBe("project:davinci:goblin:user");
    expect(projectSessionStorageKey("user", "/login")).toBeNull();
  });
});

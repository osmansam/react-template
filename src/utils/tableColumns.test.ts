import { describe, expect, it } from "vitest";
import { syncTranslatedTableColumns } from "./tableColumns";

describe("syncTranslatedTableColumns", () => {
  it("refreshes translated keys and preserves column visibility", () => {
    const existing = [
      { key: "Email", correspondingKey: "email", isSortable: true, isActive: false },
      { key: "Role", correspondingKey: "role", isSortable: true, isActive: true },
    ];
    const translated = [
      { key: "E posta", correspondingKey: "email", isSortable: true },
      { key: "Rol", correspondingKey: "role", isSortable: true },
    ];

    expect(syncTranslatedTableColumns(existing, translated)).toEqual([
      { key: "E posta", correspondingKey: "email", isSortable: true, isActive: false },
      { key: "Rol", correspondingKey: "role", isSortable: true, isActive: true },
    ]);
  });
});

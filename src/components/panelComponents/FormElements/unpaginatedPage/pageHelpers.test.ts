import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { Types, type ContainerModel, type Field } from "../../../../utils/api/container";
import {
  buildFiltersById,
  buildRequestFilters,
  buildTableColumns,
  computeDisplayFields,
  containerHasImageField,
  findMatchingContainer,
  isArrayFieldType,
  normalizeRowForEdit,
} from "./pageHelpers";

const identityT = ((key: string) => key) as unknown as TFunction;

const makeContainer = (
  schemaName: string,
  fields: Field[],
): ContainerModel => ({
  id: "1",
  schemaName,
  fields,
  routes: {} as ContainerModel["routes"],
  redis: {} as ContainerModel["redis"],
  pipelines: [],
  indexes: [],
  dynamicFunctions: [],
  dynamicApis: [],
  populatedRoutes: [],
});

describe("pageHelpers", () => {
  it("detects array field types across normalized and legacy names", () => {
    expect(isArrayFieldType("string[]", "string[]")).toBe(true);
    expect(isArrayFieldType("array<int>", "array<int>")).toBe(true);
    expect(isArrayFieldType(Types.NumberArray, Types.NumberArray)).toBe(true);
    expect(isArrayFieldType("string", "string")).toBe(false);
  });

  it("finds matching container case-insensitively", () => {
    const raw = [
      { schemaName: "Orders", fields: [] },
      { schemaName: "Products", fields: [] },
    ];
    expect(findMatchingContainer(raw, "products")?.schemaName).toBe("Products");
    expect(findMatchingContainer(raw, "missing")).toBeUndefined();
    expect(findMatchingContainer(undefined, "products")).toBeUndefined();
  });

  it("detects image fields on a container", () => {
    const withImage = makeContainer("items", [
      { name: "photo", type: Types.Image },
    ]);
    const withoutImage = makeContainer("items", [
      { name: "title", type: Types.String },
    ]);
    expect(containerHasImageField(withImage)).toBe(true);
    expect(containerHasImageField(withoutImage)).toBe(false);
    expect(containerHasImageField(undefined)).toBe(false);
  });

  it("computes display fields respecting include/exclude, id omission, and role auth", () => {
    const container = makeContainer("products", [
      { name: "_id", type: "string" },
      { name: "name", type: "string" },
      { name: "price", type: "number" },
      {
        name: "cost",
        type: "number",
        isAuthorized: true,
        authorizeRole: ["admin"],
      },
      { name: "notes", type: "string" },
    ]);

    const userFields = computeDisplayFields({
      container,
      excludeFields: ["notes"],
      userRole: "staff",
      tableToggleState: {},
      configuredTableToggles: [],
    });
    expect(userFields.map((f) => f.name)).toEqual(["name", "price"]);

    const adminFields = computeDisplayFields({
      container,
      includeFields: ["cost", "name"],
      userRole: "admin",
      tableToggleState: {},
      configuredTableToggles: [],
    });
    expect(adminFields.map((f) => f.name)).toEqual(["cost", "name"]);
  });

  it("builds request filters with constant sort, drag fallback, and overrides", () => {
    const withConstantSort = buildRequestFilters({
      filterFormElements: { search: "abc" },
      constantSort: { sort: "createdAt", asc: -1 },
      defaultSort: "order",
      configuredTableToggles: [],
      tableToggleState: {},
      constantFilters: { status: "active" },
      constantFilter: { tenant: "t1" },
      resolvedParams: { region: "eu" },
    });
    expect(withConstantSort).toEqual({
      search: "abc",
      sort: "createdAt",
      asc: -1,
      status: "active",
      tenant: "t1",
      region: "eu",
    });

    const withDragDefaultSort = buildRequestFilters({
      filterFormElements: {},
      defaultSort: "order",
      configuredTableToggles: [],
      tableToggleState: {},
    });
    expect(withDragDefaultSort).toEqual({ sort: "order", asc: 1 });
  });

  it("builds filtersById only for keys present on filterFormElements", () => {
    const result = buildFiltersById(
      [
        { id: "f1", formKey: "status", label: "Status", type: "text" },
        { id: "f2", formKey: "missing", label: "Missing", type: "text" },
      ],
      { status: "open" },
    );
    expect(result).toEqual({ f1: "open" });
  });

  it("normalizes populated objectId and objectIdArray fields for edit", () => {
    const fields: Field[] = [
      {
        name: "category",
        type: Types.ObjectId,
        populationSettings: {
          fieldName: "category",
          populatedFields: ["name"],
          displayFields: ["name"],
          inputSelectionField: "name",
          displayLabel: "Category",
        },
      },
      {
        name: "tags",
        type: Types.ObjectIdArray,
        populationSettings: {
          fieldName: "tags",
          populatedFields: ["name"],
          displayFields: ["name"],
          inputSelectionField: "name",
          displayLabel: "Tags",
        },
      },
      { name: "title", type: Types.String },
    ];
    const normalized = normalizeRowForEdit(
      {
        _id: "row-1",
        title: "Widget",
        category: { _id: "cat-1", name: "Tools" },
        tags: [{ _id: "t1", name: "New" }, "t2"],
      },
      fields,
    );
    expect(normalized).toEqual({
      _id: "row-1",
      title: "Widget",
      category: "cat-1",
      tags: ["t1", "t2"],
    });
  });

  it("builds table columns including non-sortable computedLabel and Actions column", () => {
    const fields: Field[] = [
      { name: "name", type: "string" },
      { name: "statusLabel", type: "string" },
    ];
    const cols = buildTableColumns({
      displayFields: fields,
      tableConfig: {
        columns: [
          { field: "name", displayName: "Name" },
          { field: "statusLabel", displayName: "Status", type: "computedLabel" },
        ],
        actionsColumnLabel: "Ops",
      },
      generatedColumns: [],
      actionsEnabled: true,
      t: identityT,
    });
    expect(cols).toEqual([
      { key: "Name", isSortable: true, correspondingKey: "name" },
      { key: "Status", isSortable: false, correspondingKey: "statusLabel" },
      { key: "Actions", label: "Ops", isSortable: false },
    ]);
  });
});

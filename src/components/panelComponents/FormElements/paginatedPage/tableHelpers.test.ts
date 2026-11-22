import { describe, expect, it } from "vitest";
import type { FormElementsState } from "../../../../types";
import type { TableComponentConfig } from "../../../../types/page";
import { type ContainerModel, type Field, Types } from "../../../../utils/api/container";
import {
  buildExportPayload,
  buildFiltersById,
  buildTableColumns,
  computeRowStyle,
  isArrayFieldType,
  mergeTableRequestFilters,
  normalizeRowForEdit,
  resolveDisplayFields,
} from "./tableHelpers";

const identity = (key: string) => key;

describe("tableHelpers", () => {
  describe("isArrayFieldType", () => {
    it("recognizes string, int, and number array variants", () => {
      expect(isArrayFieldType({ name: "a", type: Types.StringArray })).toBe(true);
      expect(isArrayFieldType({ name: "b", type: "stringArray" })).toBe(true);
      expect(isArrayFieldType({ name: "c", type: "int[]" })).toBe(true);
      expect(isArrayFieldType({ name: "d", type: "array<number>" })).toBe(true);
      expect(isArrayFieldType({ name: "e", type: Types.String })).toBe(false);
    });
  });

  describe("mergeTableRequestFilters", () => {
    it("applies constantSort when user has no active sort and preserves constantFilters", () => {
      const filters: FormElementsState = { asc: 1, sort: "", search: "abc" };
      const tableConfig: TableComponentConfig = {
        constantSort: { sort: "createdAt", asc: -1 },
        constantFilters: { status: "active" },
      };

      const merged = mergeTableRequestFilters(
        filters,
        { tenant: "t1" },
        tableConfig,
      );

      expect(merged).toMatchObject({
        search: "abc",
        sort: "createdAt",
        asc: -1,
        status: "active",
        tenant: "t1",
      });
    });

    it("preserves user sort over constantSort", () => {
      const filters: FormElementsState = { asc: 1, sort: "name", search: "" };
      const tableConfig: TableComponentConfig = {
        constantSort: { sort: "createdAt", asc: -1 },
      };

      const merged = mergeTableRequestFilters(filters, undefined, tableConfig);

      expect(merged.sort).toBe("name");
      expect(merged.asc).toBe(1);
    });
  });

  describe("buildFiltersById", () => {
    it("maps configured filter ids to current form element values", () => {
      const result = buildFiltersById(
        [
          { id: "statusFilter", formKey: "status", type: "text" },
          { id: "missingFilter", formKey: "missing", type: "text" },
        ],
        { status: "open", asc: 1, sort: "", search: "" },
      );

      expect(result).toEqual({ statusFilter: "open" });
      expect(Object.getPrototypeOf(result)).toBeNull();
    });
  });

  describe("resolveDisplayFields", () => {
    const baseFields: Field[] = [
      { name: "_id", type: Types.String },
      { name: "name", type: Types.String },
      { name: "secret", type: Types.String, isAuthorized: true, authorizeRole: ["admin"] },
      { name: "price", type: Types.Number },
    ];

    it("filters _id, applies include/exclude, and enforces authorizeRole", () => {
      const visibleForUser = resolveDisplayFields({
        containerFields: baseFields,
        tableToggleState: {},
        configuredTableToggles: [],
        excludeFields: ["price"],
        userRole: "viewer",
      });
      expect(visibleForUser.map((f) => f.name)).toEqual(["name"]);

      const visibleForAdmin = resolveDisplayFields({
        containerFields: baseFields,
        tableToggleState: {},
        configuredTableToggles: [],
        includeFields: ["secret", "name"],
        userRole: "admin",
      });
      expect(visibleForAdmin.map((f) => f.name)).toEqual(["secret", "name"]);
    });

    it("builds synthetic fields for configured columns missing from container", () => {
      const fields = resolveDisplayFields({
        containerFields: [{ name: "name", type: Types.String }],
        tableConfig: {
          columns: [
            { field: "name" },
            { field: "virtualCol", displayName: "Virtual" },
          ],
        },
        tableToggleState: {},
        configuredTableToggles: [],
      });

      expect(fields).toMatchObject([
        { name: "name", type: Types.String },
        {
          name: "virtualCol",
          type: "string",
          frontend: { displayName: "Virtual" },
        },
      ]);
    });
  });

  describe("buildTableColumns", () => {
    it("excludes constantFilter keys, marks computedLabel non-sortable, and appends Actions when active", () => {
      const displayFields: Field[] = [
        { name: "tenant", type: Types.String },
        { name: "title", type: Types.String },
        { name: "badge", type: Types.String },
      ];
      const cols = buildTableColumns({
        displayFields,
        constantFilter: { tenant: "t1" },
        tableConfig: {
          columns: [
            { field: "title", displayName: "Title" },
            { field: "badge", type: "computedLabel", displayName: "Badge" },
          ],
          actionsColumnLabel: "Ops",
        },
        generatedColumns: [],
        isActionsActive: true,
        t: identity,
      });

      expect(cols).toEqual([
        { key: "Title", isSortable: true, correspondingKey: "title" },
        { key: "Badge", isSortable: false, correspondingKey: "badge" },
        { key: "Actions", label: "Ops", isSortable: false },
      ]);
    });
  });

  describe("normalizeRowForEdit", () => {
    it("unwraps populated objectId and objectIdArray fields to their _id values", () => {
      const fields: Field[] = [
        {
          name: "owner",
          type: Types.ObjectId,
          populationSettings: {
            fieldName: "owner",
            populatedFields: ["name"],
            displayFields: ["name"],
            displayLabel: "Owner",
            inputSelectionField: "name",
          },
        },
        {
          name: "tags",
          type: Types.ObjectIdArray,
          populationSettings: {
            fieldName: "tags",
            populatedFields: ["label"],
            displayFields: ["label"],
            displayLabel: "Tags",
            inputSelectionField: "label",
          },
        },
        { name: "title", type: Types.String },
      ];

      const normalized = normalizeRowForEdit(
        {
          _id: "row-1",
          owner: { _id: "u1", name: "Alice" },
          tags: [{ _id: "t1", label: "Urgent" }, "t2"],
          title: "Hello",
        },
        fields,
      );

      expect(normalized).toEqual({
        _id: "row-1",
        owner: "u1",
        tags: ["t1", "t2"],
        title: "Hello",
      });
    });
  });

  describe("buildExportPayload", () => {
    const formElements: FormElementsState = {
      asc: 1,
      sort: "",
      search: "widget",
      status: "open",
    };

    it("computes limit and page for all, numberOfPages, and currentPage scopes", () => {
      expect(
        buildExportPayload({
          schemaName: "items",
          selectedFields: ["name"],
          includeSearch: true,
          includeFilters: true,
          exportScope: "all",
          rowsPerPage: 20,
          currentPage: 3,
          filterPanelFormElements: formElements,
        }),
      ).toEqual({
        schemaName: "items",
        fields: ["name"],
        filters: formElements,
        search: "widget",
        limit: 0,
        page: 1,
      });

      expect(
        buildExportPayload({
          schemaName: "items",
          selectedFields: ["name"],
          includeSearch: false,
          includeFilters: false,
          exportScope: "numberOfPages",
          pageCount: 4,
          rowsPerPage: 25,
          currentPage: 2,
          filterPanelFormElements: formElements,
        }),
      ).toEqual({
        schemaName: "items",
        fields: ["name"],
        filters: {},
        search: "",
        limit: 100,
        page: 1,
      });

      expect(
        buildExportPayload({
          schemaName: "items",
          selectedFields: ["name"],
          includeSearch: false,
          includeFilters: false,
          exportScope: "currentPage",
          rowsPerPage: 15,
          currentPage: 5,
          filterPanelFormElements: formElements,
        }),
      ).toEqual({
        schemaName: "items",
        fields: ["name"],
        filters: {},
        search: "",
        limit: 15,
        page: 5,
      });
    });
  });

  describe("computeRowStyle", () => {
    it("returns empty object when no row class configs match", () => {
      const container = { schemaName: "items", fields: [] } as unknown as ContainerModel;
      expect(computeRowStyle({ _id: "1" }, undefined, container)).toEqual({});
    });
  });
});

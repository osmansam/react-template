import { describe, expect, it } from "vitest";
import { type Field, Types } from "../../../../utils/api/container";
import { FormKeyTypeEnum, InputTypes } from "../../shared/types";
import {
  buildBulkEditInputs,
  buildBulkFieldOptions,
  buildBulkFormKeys,
  buildBulkInitialStepTwoValues,
  coerceBulkEditUpdates,
} from "./bulkInputBuilders";
import {
  buildDefaultFilterPanelInputs,
  buildFormInputsAndKeys,
} from "./formInputBuilders";

const identity = (key: string) => key;

describe("formInputBuilders & bulkInputBuilders", () => {
  const fields: Field[] = [
    { name: "title", type: Types.String, tag: "required,minlength=2" },
    { name: "active", type: Types.Boolean },
    { name: "avatar", type: Types.Image },
    { name: "total", type: Types.Number, equation: "a + b" },
    {
      name: "category",
      type: Types.ObjectId,
      objectSchemaName: "categories",
      populationSettings: {
        fieldName: "category",
        populatedFields: ["name"],
        displayFields: ["name"],
        inputSelectionField: "name",
        displayLabel: "Category",
      },
    },
    {
      name: "roles",
      type: Types.StringArray,
      enumList: ["admin", "editor"],
    },
  ];

  const selectionDataMap = new Map<string, Array<Record<string, unknown>>>([
    ["category", [{ _id: "c1", name: "Books" }]],
  ]);

  describe("buildFormInputsAndKeys", () => {
    it("skips computed fields, maps populated selects and enum arrays, and extracts constantFilterKeys", () => {
      const { inputs, formKeys, constantFilterKeys } = buildFormInputsAndKeys({
        displayFields: fields,
        constantFilter: { tenant: "t1" },
        selectionDataMap,
        t: identity,
      });

      expect(constantFilterKeys).toEqual(["tenant"]);
      expect(inputs.map((i) => i.formKey)).toEqual([
        "title",
        "active",
        "avatar",
        "category",
        "roles",
      ]);
      expect(formKeys.map((k) => k.key)).toEqual([
        "title",
        "active",
        "avatar",
        "category",
        "roles",
      ]);

      const categoryInput = inputs.find((i) => i.formKey === "category");
      expect(categoryInput?.type).toBe(InputTypes.SELECT);
      expect(categoryInput?.options).toEqual([
        { value: "c1", label: "Books", sourceItem: { _id: "c1", name: "Books" } },
      ]);

      const rolesInput = inputs.find((i) => i.formKey === "roles");
      expect(rolesInput?.type).toBe(InputTypes.SELECT);
      expect(rolesInput?.isMultiple).toBe(true);
    });
  });

  describe("buildDefaultFilterPanelInputs", () => {
    it("excludes image and constantFilter fields and turns booleans into True/False selects", () => {
      const result = buildDefaultFilterPanelInputs({
        displayFields: fields,
        constantFilter: { title: "fixed" },
        selectionDataMap,
        t: identity,
      });

      expect(result.map((i) => i.formKey)).toEqual([
        "active",
        "total",
        "category",
        "roles",
      ]);
      const activeFilter = result.find((i) => i.formKey === "active");
      expect(activeFilter?.type).toBe(InputTypes.SELECT);
      expect(activeFilter?.options).toEqual([
        { value: "true", label: "True" },
        { value: "false", label: "False" },
      ]);
    });
  });

  describe("bulk edit builders and coercion", () => {
    it("excludes image and computed fields from default bulk options", () => {
      const opts = buildBulkFieldOptions({
        configuredBulkEditFields: [],
        displayFields: fields,
        t: identity,
      });
      expect(opts.map((o) => o.value)).toEqual([
        "title",
        "active",
        "category",
        "roles",
      ]);
    });

    it("switches bulkFormKeys between step 1 and step 2", () => {
      const step1 = buildBulkFormKeys({
        isBulkStepTwo: false,
        configuredBulkEditFields: [],
        displayFields: fields,
        bulkSelectedKeys: ["title"],
      });
      expect(step1).toEqual([
        { key: "bulkSelectedKeys", type: FormKeyTypeEnum.STRING },
      ]);

      const step2 = buildBulkFormKeys({
        isBulkStepTwo: true,
        configuredBulkEditFields: [],
        displayFields: fields,
        bulkSelectedKeys: ["title", "active"],
      });
      expect(step2.map((k) => k.key)).toEqual(["title", "active"]);
    });

    it("builds step 2 bulk inputs with select disabled and value inputs enabled", () => {
      const inputs = buildBulkEditInputs({
        t: identity,
        bulkFieldOptions: [{ value: "title", label: "Title" }],
        isBulkStepTwo: true,
        displayFields: fields,
        bulkSelectedKeys: ["title"],
        configuredBulkEditFields: [],
        bulkActionSelectionDataMap: new Map(),
        selectionDataMap,
      });

      expect(inputs).toHaveLength(2);
      expect(inputs[0].formKey).toBe("bulkSelectedKeys");
      expect(inputs[0].isDisabled).toBe(true);
      expect(inputs[1].formKey).toBe("title");
      expect(inputs[1].isDisabled).toBe(false);
    });

    it("coerces boolean, number, stringArray, intArray, and numberArray values", () => {
      const updates = coerceBulkEditUpdates({
        bulkForm: {
          flag: "true",
          emptyFlag: "",
          count: "42",
          tags: " a , b , ",
          ints: "1, 2, bad, 3",
          floats: ["1.5", 2.5],
          ignored: "skip-me",
        },
        bulkSelectedKeys: ["flag", "emptyFlag", "count", "tags", "ints", "floats"],
        bulkFormKeys: [
          { key: "flag", type: FormKeyTypeEnum.BOOLEAN },
          { key: "emptyFlag", type: FormKeyTypeEnum.BOOLEAN },
          { key: "count", type: FormKeyTypeEnum.NUMBER },
          { key: "tags", type: FormKeyTypeEnum.STRING_ARRAY },
          { key: "ints", type: FormKeyTypeEnum.INT_ARRAY },
          { key: "floats", type: FormKeyTypeEnum.NUMBER_ARRAY },
        ],
      });

      expect(updates).toEqual({
        flag: true,
        emptyFlag: false,
        count: 42,
        tags: ["a", "b"],
        ints: [1, 2, 3],
        floats: [1.5, 2.5],
      });
    });

    it("initializes selected boolean fields to false for step two", () => {
      const init = buildBulkInitialStepTwoValues({
        selectedKeys: ["active", "title"],
        displayFields: fields,
      });
      expect(init).toEqual({ active: false });
    });
  });
});

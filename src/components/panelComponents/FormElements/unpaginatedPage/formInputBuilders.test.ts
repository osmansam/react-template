import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { Types, type Field } from "../../../../utils/api/container";
import { FormKeyTypeEnum, InputTypes } from "../../shared/types";
import {
  buildAddEditFormConfig,
  buildDefaultFilterPanelInputs,
} from "./formInputBuilders";
import {
  buildBulkFieldOptions,
  buildBulkFormKeys,
  coerceBulkUpdates,
  computeInitialBulkValues,
} from "./bulkFormBuilders";

const identityT = ((key: string) => key) as unknown as TFunction;

describe("formInputBuilders", () => {
  it("builds add/edit inputs and formKeys, skipping computed fields and mapping selects", () => {
    const fields: Field[] = [
      { name: "title", type: Types.String, tag: "required" },
      { name: "total", type: Types.Number, equation: "price * qty" },
      {
        name: "status",
        type: Types.String,
        enumList: ["open", "closed"],
      },
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
    ];
    const selectionDataMap = new Map([
      ["category", [{ _id: "c1", name: "Books" }]],
    ]);

    const { inputs, formKeys } = buildAddEditFormConfig({
      displayFields: fields,
      selectionDataMap,
      t: identityT,
    });

    expect(inputs.map((i) => i.formKey)).toEqual(["title", "status", "category"]);
    expect(formKeys.map((k) => k.key)).toEqual(["title", "status", "category"]);
    expect(inputs[1].type).toBe(InputTypes.SELECT);
    expect(inputs[2].type).toBe(InputTypes.SELECT);
    expect(inputs[2].options).toEqual([
      { value: "c1", label: "Books", sourceItem: { _id: "c1", name: "Books" } },
    ]);
  });

  it("builds default filter panel inputs excluding images and converting booleans to select", () => {
    const fields: Field[] = [
      { name: "avatar", type: Types.Image },
      { name: "isActive", type: Types.Boolean },
      { name: "name", type: Types.String },
    ];

    const filters = buildDefaultFilterPanelInputs({
      displayFields: fields,
      selectionDataMap: new Map(),
      t: identityT,
    });

    expect(filters.map((f) => f.formKey)).toEqual(["isActive", "name"]);
    expect(filters[0].type).toBe(InputTypes.SELECT);
    expect(filters[0].options).toEqual([
      { value: "true", label: "True" },
      { value: "false", label: "False" },
    ]);
  });

  it("builds bulk field options, formKeys, and initial boolean defaults", () => {
    const fields: Field[] = [
      { name: "photo", type: Types.Image },
      { name: "active", type: Types.Boolean },
      { name: "count", type: Types.Number },
    ];

    const options = buildBulkFieldOptions({
      configuredBulkEditFields: [],
      displayFields: fields,
      t: identityT,
    });
    expect(options.map((o) => o.value)).toEqual(["active", "count"]);

    expect(
      buildBulkFormKeys({
        isBulkStepTwo: false,
        configuredBulkEditFields: [],
        displayFields: fields,
        bulkSelectedKeys: ["active"],
      }),
    ).toEqual([{ key: "bulkSelectedKeys", type: FormKeyTypeEnum.STRING }]);

    expect(
      buildBulkFormKeys({
        isBulkStepTwo: true,
        configuredBulkEditFields: [],
        displayFields: fields,
        bulkSelectedKeys: ["active", "count"],
      }),
    ).toEqual([
      { key: "active", type: FormKeyTypeEnum.BOOLEAN },
      { key: "count", type: FormKeyTypeEnum.NUMBER },
    ]);

    expect(
      computeInitialBulkValues({
        selectedKeys: ["active", "count"],
        configuredBulkEditFields: [],
        displayFields: fields,
      }),
    ).toEqual({ active: false });
  });

  it("coerces bulk updates for boolean, number, and array field types", () => {
    const updates = coerceBulkUpdates({
      bulkForm: {
        active: "true",
        emptyBool: "",
        price: "42.5",
        tags: "a, b , , c",
        ints: "1, 2, bad, 3",
        floats: ["1.5", 2.5],
        ignored: "nope",
      },
      bulkSelectedKeys: ["active", "emptyBool", "price", "tags", "ints", "floats"],
      bulkFormKeys: [
        { key: "active", type: FormKeyTypeEnum.BOOLEAN },
        { key: "emptyBool", type: FormKeyTypeEnum.BOOLEAN },
        { key: "price", type: FormKeyTypeEnum.NUMBER },
        { key: "tags", type: FormKeyTypeEnum.STRING_ARRAY },
        { key: "ints", type: FormKeyTypeEnum.INT_ARRAY },
        { key: "floats", type: FormKeyTypeEnum.NUMBER_ARRAY },
      ],
    });

    expect(updates).toEqual({
      active: true,
      emptyBool: false,
      price: 42.5,
      tags: ["a", "b", "c"],
      ints: [1, 2, 3],
      floats: [1.5, 2.5],
    });
  });
});

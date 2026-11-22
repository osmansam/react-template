import { describe, expect, it } from "vitest";
import {
  FormKeyType,
  FormKeyTypeEnum,
  GenericInputType,
  InputTypes,
} from "../../shared/types";
import {
  applyClearInput,
  applyFieldValueChange,
  areAllRequiredFieldsFilled,
  buildFieldValidationRules,
  buildInitialFormElements,
  buildInitialFormState,
  convertFormElementsForSubmit,
  extractSelectNextValue,
  getPreservedFormValues,
  hasBlockedDependentSelectInput,
  hasFailedPhoneValidation,
  isFormValueEmpty,
  validateAllFormInputs,
  validateInputFieldValue,
} from "./formHelpers";

describe("addEditPanel/formHelpers", () => {
  describe("buildInitialFormState", () => {
    it("maps each FormKeyTypeEnum to its expected default value", () => {
      const formKeys: FormKeyType[] = [
        { key: "name", type: FormKeyTypeEnum.STRING },
        { key: "color", type: FormKeyTypeEnum.COLOR },
        { key: "count", type: FormKeyTypeEnum.NUMBER },
        { key: "active", type: FormKeyTypeEnum.BOOLEAN },
        { key: "createdAt", type: FormKeyTypeEnum.DATE },
        { key: "tags", type: FormKeyTypeEnum.STRING_ARRAY },
        { key: "ids", type: FormKeyTypeEnum.INT_ARRAY },
        { key: "scores", type: FormKeyTypeEnum.NUMBER_ARRAY },
      ];

      expect(buildInitialFormState(formKeys)).toEqual({
        name: "",
        color: "#ffffff",
        count: null,
        active: false,
        createdAt: "",
        tags: "",
        ids: "",
        scores: "",
      });
    });
  });

  describe("buildInitialFormElements", () => {
    const formKeys: FormKeyType[] = [
      { key: "name", type: FormKeyTypeEnum.STRING },
      { key: "active", type: FormKeyTypeEnum.BOOLEAN },
    ];
    const inputs: GenericInputType[] = [
      { formKey: "name", type: InputTypes.TEXT, label: "Name", required: true },
      {
        formKey: "active",
        type: InputTypes.CHECKBOX,
        label: "Active",
        required: false,
      },
    ];

    it("returns mergedInitialState when itemToEdit is absent", () => {
      const initialState = buildInitialFormState(formKeys);
      const merged = { ...initialState, name: "Default" };
      expect(
        buildInitialFormElements(formKeys, inputs, initialState, merged, {
          name: "Default",
        }),
      ).toEqual(merged);
    });

    it("merges initialState, constantValues, and processed itemToEdit updates", () => {
      const initialState = buildInitialFormState(formKeys);
      const merged = { ...initialState, name: "Constant" };
      const result = buildInitialFormElements(
        formKeys,
        inputs,
        initialState,
        merged,
        { name: "Constant" },
        { id: 1, updates: { name: "Edited" } },
      );
      expect(result).toEqual({ name: "Edited", active: false });
    });
  });

  describe("isFormValueEmpty", () => {
    it("treats undefined, null, empty string, and empty array as empty", () => {
      expect(isFormValueEmpty(undefined)).toBe(true);
      expect(isFormValueEmpty(null)).toBe(true);
      expect(isFormValueEmpty("")).toBe(true);
      expect(isFormValueEmpty([])).toBe(true);
    });

    it("treats non-empty values including 0 and false as non-empty", () => {
      expect(isFormValueEmpty(0)).toBe(false);
      expect(isFormValueEmpty(false)).toBe(false);
      expect(isFormValueEmpty("hello")).toBe(false);
      expect(isFormValueEmpty(["a"])).toBe(false);
    });
  });

  describe("buildFieldValidationRules & validation", () => {
    it("infers email, phone, and url rules from formKey or additionalType", () => {
      expect(
        buildFieldValidationRules({
          formKey: "userEmail",
          type: InputTypes.TEXT,
          required: true,
          minLength: 5,
        }),
      ).toEqual({ required: true, minlength: 5, email: true });

      expect(
        buildFieldValidationRules({
          formKey: "contact",
          type: InputTypes.TEXT,
          additionalType: "phone",
          required: false,
        }),
      ).toEqual({ phone: true });

      expect(
        buildFieldValidationRules({
          formKey: "websiteUrl",
          type: InputTypes.TEXT,
          required: false,
        }),
      ).toEqual({ url: true });
    });

    it("validates individual and all form inputs", () => {
      const formKeys: FormKeyType[] = [
        { key: "email", type: FormKeyTypeEnum.STRING },
        { key: "age", type: FormKeyTypeEnum.NUMBER },
      ];
      const inputs: GenericInputType[] = [
        {
          formKey: "email",
          type: InputTypes.TEXT,
          required: true,
          additionalType: "email",
        },
        {
          formKey: "age",
          type: InputTypes.NUMBER,
          min: 18,
          required: false,
        },
      ];

      expect(validateInputFieldValue(inputs[0], "bad-email", formKeys)).toBeTruthy();
      expect(validateInputFieldValue(inputs[0], "a@b.com", formKeys)).toBeNull();

      const errors = validateAllFormInputs(
        inputs,
        { email: "bad-email", age: 10 },
        formKeys,
      );
      expect(Object.keys(errors)).toEqual(["email", "age"]);
    });
  });

  describe("areAllRequiredFieldsFilled", () => {
    const inputs: GenericInputType[] = [
      { formKey: "name", type: InputTypes.TEXT, required: true },
      { formKey: "note", type: InputTypes.TEXT, required: false },
    ];

    it("returns false when any required field is empty", () => {
      expect(areAllRequiredFieldsFilled(inputs, { name: "", note: "ok" })).toBe(
        false,
      );
    });

    it("returns true when all required fields are filled", () => {
      expect(areAllRequiredFieldsFilled(inputs, { name: "Ada", note: "" })).toBe(
        true,
      );
    });
  });

  describe("hasBlockedDependentSelectInput", () => {
    it("returns true when an active input has selectionStatus", () => {
      const inputs: GenericInputType[] = [
        {
          formKey: "city",
          type: InputTypes.SELECT,
          required: false,
          selectionStatus: "loading",
        },
      ];
      expect(hasBlockedDependentSelectInput(inputs, {})).toBe(true);
    });

    it("ignores inputs that are disabled", () => {
      const inputs: GenericInputType[] = [
        {
          formKey: "city",
          type: InputTypes.SELECT,
          required: false,
          isDisabled: true,
          selectionStatus: "loading",
        },
      ];
      expect(hasBlockedDependentSelectInput(inputs, {})).toBe(false);
    });
  });

  describe("hasFailedPhoneValidation", () => {
    const inputs: GenericInputType[] = [
      {
        formKey: "phone",
        type: InputTypes.TEXT,
        additionalType: "phone",
        required: true,
      },
    ];

    it("fails when phone is not 11 digits", () => {
      expect(hasFailedPhoneValidation(inputs, { phone: "12345" })).toBe(true);
    });

    it("passes when phone is 11 digits", () => {
      expect(hasFailedPhoneValidation(inputs, { phone: "05551234567" })).toBe(
        false,
      );
    });
  });

  describe("convertFormElementsForSubmit", () => {
    it("converts booleans, numbers, and comma-separated arrays", () => {
      const formKeys: FormKeyType[] = [
        { key: "flagEmpty", type: FormKeyTypeEnum.BOOLEAN },
        { key: "flagTrue", type: FormKeyTypeEnum.BOOLEAN },
        { key: "amount", type: FormKeyTypeEnum.NUMBER },
        { key: "tags", type: FormKeyTypeEnum.STRING_ARRAY },
        { key: "ids", type: FormKeyTypeEnum.INT_ARRAY },
        { key: "weights", type: FormKeyTypeEnum.NUMBER_ARRAY },
      ];

      const converted = convertFormElementsForSubmit(
        {
          flagEmpty: undefined,
          flagTrue: "true",
          amount: "42.5",
          tags: " a, b , , c ",
          ids: "1, 2, bad, 3",
          weights: "1.5, 2.25, nope",
        },
        formKeys,
      );

      expect(converted).toEqual({
        flagEmpty: false,
        flagTrue: true,
        amount: 42.5,
        tags: ["a", "b", "c"],
        ids: [1, 2, 3],
        weights: [1.5, 2.25],
      });
    });
  });

  describe("applyClearInput & applyFieldValueChange", () => {
    const inputs: GenericInputType[] = [
      {
        formKey: "category",
        type: InputTypes.SELECT,
        required: false,
        invalidateKeys: [{ key: "subCategory", defaultValue: "" }],
      },
      {
        formKey: "tags",
        type: InputTypes.SELECT,
        required: false,
        isMultiple: true,
      },
    ];
    const initialState = { category: "", subCategory: "", tags: "" };

    it("clears multi-select to [] and resets invalidated keys", () => {
      const clearedMulti = applyClearInput(
        inputs,
        { category: "c1", subCategory: "s1", tags: ["t1"] },
        inputs[1],
        initialState,
      );
      expect(clearedMulti.tags).toEqual([]);

      const clearedCategory = applyClearInput(
        inputs,
        { category: "c1", subCategory: "s1", tags: ["t1"] },
        inputs[0],
        initialState,
      );
      expect(clearedCategory.category).toBe("");
      expect(clearedCategory.subCategory).toBe("");
    });

    it("updates value and resets invalidated keys on field change", () => {
      const updated = applyFieldValueChange(
        inputs,
        { category: "c1", subCategory: "s1", tags: [] },
        "category",
        "c2",
        initialState,
        inputs[0],
      );
      expect(updated.category).toBe("c2");
      expect(updated.subCategory).toBe("");
    });
  });

  describe("extractSelectNextValue & getPreservedFormValues", () => {
    it("extracts values from single, multi, or null select values", () => {
      expect(extractSelectNextValue({ value: "v1", label: "V1" })).toBe("v1");
      expect(
        extractSelectNextValue([
          { value: "a", label: "A" },
          { value: "b", label: "B" },
        ]),
      ).toEqual(["a", "b"]);
      expect(extractSelectNextValue(null)).toBe("");
    });

    it("collects preserved keys from formElements", () => {
      expect(
        getPreservedFormValues({ a: 1, b: 2, c: 3 }, ["a", "c"]),
      ).toEqual({ a: 1, c: 3 });
      expect(getPreservedFormValues({ a: 1 }, undefined)).toBeUndefined();
    });
  });
});

# Tenant-Driven Form Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tenantPanel-configurable form page component that supports custom field areas, embedded object-list sections, local add/edit/remove/increment/decrement actions, and final parent-record save.

**Architecture:** Add form metadata to `autotable-Go`, render that metadata in `react-template` through a new `DynamicForm`, and edit the same metadata in `tenantPanel` PageDesigner. Reuse existing action form field config, field input mapping, validation/conversion behavior, and dynamic page rendering patterns instead of creating a second unrelated form system.

**Tech Stack:** Go models and tests in `autotable-Go`; React 18, TypeScript, Vite, Tailwind, React Query in `react-template` and `tenantPanel`; existing `GenericAddEditPanel`, table action helpers, and PageDesigner patterns.

---

## File Structure

### `autotable-Go`

- Modify `/Users/osmansamilerdogan/Desktop/autotable-Go/models/pageModel.go`
  - Add `FormComponentConfig`, `FormLayoutConfig`, `FormAreaConfig`, `FormFieldConfig`, `FormObjectListConfig`, `FormObjectListDisplayConfig`, `FormObjectActionConfig`, `FormActionConfig`, and `FormSubmitConfig`.
  - Add `Form *FormComponentConfig` to `ComponentBlock`.
- Modify `/Users/osmansamilerdogan/Desktop/autotable-Go/models/frontendValidation.go`
  - Add validation for form components and nested tab components.
- Modify `/Users/osmansamilerdogan/Desktop/autotable-Go/models/models_test.go`
  - Add model round-trip and validation tests.

### `react-template`

- Modify `/Users/osmansamilerdogan/Desktop/react-template/src/types/page.ts`
  - Add runtime form config TypeScript types and `form?: FormComponentConfig` to `ComponentBlock`.
- Create `/Users/osmansamilerdogan/Desktop/react-template/src/utils/formConfig.ts`
  - Convert `FormFieldConfig` into `GenericInputType` and `FormKeyType`.
  - Provide helpers for defaults, templates, and object-list normalization.
- Create `/Users/osmansamilerdogan/Desktop/react-template/src/components/forms/DynamicForm.tsx`
  - Render configured form areas and embedded object lists.
  - Manage local form state, object-list editing state, local actions, and final submit.
- Modify `/Users/osmansamilerdogan/Desktop/react-template/src/components/DynamicPageSections.tsx`
  - Render `type: "form"` with `DynamicForm`.
- Modify `/Users/osmansamilerdogan/Desktop/react-template/src/components/panelComponents/shared/types.ts`
  - Broaden `FormElementValue` so embedded object arrays can live in form state.

### `tenantPanel`

- Modify `/Users/osmansamilerdogan/Desktop/tenantPanel/src/types/page.ts`
  - Add tenant-side form config types and `form?: FormComponentConfig` to `ComponentBlock`.
- Modify `/Users/osmansamilerdogan/Desktop/tenantPanel/src/utils/api/page.ts`
  - Add API form config interfaces and `form?: PageFormComponentConfig`.
- Modify `/Users/osmansamilerdogan/Desktop/tenantPanel/src/components/PageDesigner/PageDesigner.tsx`
  - Add `Form` component type.
  - Add form config state, defaults, cleaning, hydration, and UI controls.
  - Save form config on component payloads.
- Modify `/Users/osmansamilerdogan/Desktop/tenantPanel/src/pages/PagePreviewPage.tsx`
  - Add summary preview support for `type: "form"` in the tenantPanel preview renderer.

---

## Task 1: Backend Form Metadata Models

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/autotable-Go/models/pageModel.go`
- Test: `/Users/osmansamilerdogan/Desktop/autotable-Go/models/models_test.go`

- [ ] **Step 1: Write failing round-trip test**

Append this test to `models/models_test.go`:

```go
func TestFormComponentConfigRoundTrip(t *testing.T) {
	page := PageModel{
		Name: "Sales",
		Sections: []Section{{
			Type: SectionTypeComponent,
			Component: &ComponentBlock{
				ID:    "sales-form",
				Type:  ComponentTypeForm,
				Title: "Sales Form",
				Form: &FormComponentConfig{
					Title:      "Satış Detayları",
					SchemaName: "sales",
					Layout: &FormLayoutConfig{
						Variant: "page",
						Columns: 2,
						Areas: []FormAreaConfig{{
							Key:   "main",
							Title: "Sale",
							Order: 1,
						}, {
							Key:   "right",
							Title: "Sepet",
							Order: 2,
						}},
					},
					Fields: []FormFieldConfig{{
						ActionFormFieldConfig: ActionFormFieldConfig{
							FormKey:     "saleDate",
							Type:        "date",
							FormKeyType: "date",
							Label:       "Satış Tarihi",
						},
						Area:  "main",
						Order: 1,
						Width: "full",
					}, {
						ActionFormFieldConfig: ActionFormFieldConfig{
							FormKey:     "quantity",
							Type:        "number",
							FormKeyType: "number",
							Label:       "Adet",
							Required:    boolPtr(true),
						},
						Area:  "main",
						Order: 3,
						Width: "half",
					}},
					ObjectLists: []FormObjectListConfig{{
						Key:        "items",
						Title:      "Sepet",
						Area:       "right",
						Source:     "embedded",
						ItemFields: []string{"product", "quantity", "note"},
						Display: &FormObjectListDisplayConfig{
							PrimaryField:      "productLabel",
							SecondaryTemplate: "{{quantity}} adet",
							ImageField:        "image",
						},
						Actions: []FormObjectActionConfig{{
							Kind: "editObject",
							Icon: "FiEdit",
						}, {
							Kind: "removeObject",
							Icon: "FiTrash2",
						}, {
							Kind:  "increment",
							Field: "quantity",
							Step:  1,
						}, {
							Kind:  "decrement",
							Field: "quantity",
							Min:   floatPtr(1),
							Step:  1,
						}},
					}},
					Actions: []FormActionConfig{{
						Kind:             "addObject",
						Label:            "+ Sepete Ekle",
						TargetObjectList: "items",
						SourceFields:     []string{"product", "quantity", "note"},
						ClearSourceFields: []string{
							"product",
							"quantity",
							"note",
						},
					}, {
						Kind:       "submit",
						ButtonName: "Satışı Kaydet",
					}},
				},
			},
		}},
	}

	encoded, err := json.Marshal(page)
	if err != nil {
		t.Fatalf("json.Marshal(PageModel) error = %v", err)
	}

	var got PageModel
	if err := json.Unmarshal(encoded, &got); err != nil {
		t.Fatalf("json.Unmarshal(PageModel) error = %v", err)
	}

	form := got.Sections[0].Component.Form
	if form == nil {
		t.Fatal("Component.Form = nil, want form config")
	}
	if form.SchemaName != "sales" {
		t.Fatalf("form.SchemaName = %q, want sales", form.SchemaName)
	}
	if gotField := form.Fields[0]; gotField.FormKey != "saleDate" || gotField.Area != "main" {
		t.Fatalf("form.Fields[0] = %#v, want saleDate in main area", gotField)
	}
	if gotList := form.ObjectLists[0]; gotList.Key != "items" || gotList.Display.SecondaryTemplate != "{{quantity}} adet" {
		t.Fatalf("form.ObjectLists[0] = %#v, want configured items list", gotList)
	}

	bsonBytes, err := bson.Marshal(page)
	if err != nil {
		t.Fatalf("bson.Marshal(PageModel) error = %v", err)
	}

	var bsonGot PageModel
	if err := bson.Unmarshal(bsonBytes, &bsonGot); err != nil {
		t.Fatalf("bson.Unmarshal(PageModel) error = %v", err)
	}
	if bsonGot.Sections[0].Component.Form == nil {
		t.Fatal("BSON Component.Form = nil, want form config")
	}
}

func boolPtr(value bool) *bool {
	return &value
}

func floatPtr(value float64) *float64 {
	return &value
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
go test ./models -run TestFormComponentConfigRoundTrip -count=1
```

Expected: FAIL with undefined identifiers such as `FormComponentConfig`.

- [ ] **Step 3: Add form model structs**

In `models/pageModel.go`, insert these structs after `TableComponentConfig`:

```go
// FormLayoutConfig controls the layout shell for form components.
type FormLayoutConfig struct {
	Variant string           `bson:"variant,omitempty" json:"variant,omitempty"`
	Columns int              `bson:"columns,omitempty" json:"columns,omitempty"`
	Areas   []FormAreaConfig `bson:"areas,omitempty" json:"areas,omitempty"`
}

// FormAreaConfig defines one named area inside a form layout.
type FormAreaConfig struct {
	Key       string `bson:"key" json:"key"`
	Title     string `bson:"title,omitempty" json:"title,omitempty"`
	Order     int    `bson:"order,omitempty" json:"order,omitempty"`
	ClassName string `bson:"className,omitempty" json:"className,omitempty"`
}

// FormFieldConfig reuses action form field metadata and adds layout placement.
type FormFieldConfig struct {
	ActionFormFieldConfig `bson:",inline"`
	Area                  string `bson:"area,omitempty" json:"area,omitempty"`
	Order                 int    `bson:"order,omitempty" json:"order,omitempty"`
	Width                 string `bson:"width,omitempty" json:"width,omitempty"`
}

// FormObjectListDisplayConfig controls how embedded list items are displayed.
type FormObjectListDisplayConfig struct {
	PrimaryField      string `bson:"primaryField,omitempty" json:"primaryField,omitempty"`
	PrimaryTemplate   string `bson:"primaryTemplate,omitempty" json:"primaryTemplate,omitempty"`
	SecondaryField    string `bson:"secondaryField,omitempty" json:"secondaryField,omitempty"`
	SecondaryTemplate string `bson:"secondaryTemplate,omitempty" json:"secondaryTemplate,omitempty"`
	ImageField        string `bson:"imageField,omitempty" json:"imageField,omitempty"`
}

// FormObjectActionConfig defines local actions for embedded object list items.
type FormObjectActionConfig struct {
	Kind  string   `bson:"kind" json:"kind"`
	Label string   `bson:"label,omitempty" json:"label,omitempty"`
	Icon  string   `bson:"icon,omitempty" json:"icon,omitempty"`
	Field string   `bson:"field,omitempty" json:"field,omitempty"`
	Min   *float64 `bson:"min,omitempty" json:"min,omitempty"`
	Max   *float64 `bson:"max,omitempty" json:"max,omitempty"`
	Step  float64  `bson:"step,omitempty" json:"step,omitempty"`
}

// FormActionConfig defines actions attached to the form itself.
type FormActionConfig struct {
	Kind                 string   `bson:"kind" json:"kind"`
	Label                string   `bson:"label,omitempty" json:"label,omitempty"`
	ButtonName           string   `bson:"buttonName,omitempty" json:"buttonName,omitempty"`
	TargetObjectList     string   `bson:"targetObjectList,omitempty" json:"targetObjectList,omitempty"`
	SourceFields         []string `bson:"sourceFields,omitempty" json:"sourceFields,omitempty"`
	ClearSourceFields    []string `bson:"clearSourceFields,omitempty" json:"clearSourceFields,omitempty"`
	PreserveSourceFields []string `bson:"preserveSourceFields,omitempty" json:"preserveSourceFields,omitempty"`
	Enabled              *bool    `bson:"enabled,omitempty" json:"enabled,omitempty"`
	Order                int      `bson:"order,omitempty" json:"order,omitempty"`
}

// FormObjectListConfig describes an embedded object array rendered inside a form.
type FormObjectListConfig struct {
	Key        string                       `bson:"key" json:"key"`
	Title      string                       `bson:"title,omitempty" json:"title,omitempty"`
	Area       string                       `bson:"area,omitempty" json:"area,omitempty"`
	Source     string                       `bson:"source,omitempty" json:"source,omitempty"`
	ItemFields []string                     `bson:"itemFields,omitempty" json:"itemFields,omitempty"`
	AddAction  *FormActionConfig            `bson:"addAction,omitempty" json:"addAction,omitempty"`
	Display    *FormObjectListDisplayConfig `bson:"display,omitempty" json:"display,omitempty"`
	Actions    []FormObjectActionConfig     `bson:"actions,omitempty" json:"actions,omitempty"`
}

// FormSubmitConfig controls final form submission.
type FormSubmitConfig struct {
	ButtonName     string                 `bson:"buttonName,omitempty" json:"buttonName,omitempty"`
	ConstantValues map[string]interface{} `bson:"constantValues,omitempty" json:"constantValues,omitempty"`
}

// FormComponentConfig keeps form-specific configuration on page form components.
type FormComponentConfig struct {
	Title       string                 `bson:"title,omitempty" json:"title,omitempty"`
	SchemaName  string                 `bson:"schemaName" json:"schemaName"`
	Layout      *FormLayoutConfig      `bson:"layout,omitempty" json:"layout,omitempty"`
	Fields      []FormFieldConfig      `bson:"fields,omitempty" json:"fields,omitempty"`
	ObjectLists []FormObjectListConfig `bson:"objectLists,omitempty" json:"objectLists,omitempty"`
	Actions     []FormActionConfig     `bson:"actions,omitempty" json:"actions,omitempty"`
	Submit      *FormSubmitConfig      `bson:"submit,omitempty" json:"submit,omitempty"`
}
```

Then add this field to `ComponentBlock` after `Table`:

```go
Form *FormComponentConfig `bson:"form,omitempty" json:"form,omitempty"` // Form-specific field layout, actions, and embedded object lists
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
go test ./models -run TestFormComponentConfigRoundTrip -count=1
```

Expected: PASS.

- [ ] **Step 5: Format and commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
gofmt -w models/pageModel.go models/models_test.go
git add models/pageModel.go models/models_test.go
git commit -m "feat: add form component metadata models"
```

Expected: commit succeeds.

---

## Task 2: Backend Form Validation

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/autotable-Go/models/frontendValidation.go`
- Test: `/Users/osmansamilerdogan/Desktop/autotable-Go/models/models_test.go`

- [ ] **Step 1: Write failing validation tests**

Append this test to `models/models_test.go`:

```go
func TestValidateFormComponentConfig(t *testing.T) {
	tests := []struct {
		name    string
		form    *FormComponentConfig
		wantErr string
	}{
		{name: "nil form"},
		{
			name: "valid form",
			form: &FormComponentConfig{
				SchemaName: "sales",
				Fields: []FormFieldConfig{{
					ActionFormFieldConfig: ActionFormFieldConfig{
						FormKey: "saleDate",
						Type:    "date",
					},
				}},
				ObjectLists: []FormObjectListConfig{{
					Key:    "items",
					Source: "embedded",
					Actions: []FormObjectActionConfig{{
						Kind: "editObject",
					}, {
						Kind:  "increment",
						Field: "quantity",
					}},
				}},
				Actions: []FormActionConfig{{
					Kind:             "addObject",
					TargetObjectList: "items",
				}, {
					Kind: "submit",
				}},
			},
		},
		{
			name:    "missing schema",
			form:    &FormComponentConfig{},
			wantErr: "form requires schemaName",
		},
		{
			name: "field missing form key",
			form: &FormComponentConfig{
				SchemaName: "sales",
				Fields: []FormFieldConfig{{
					ActionFormFieldConfig: ActionFormFieldConfig{Type: "text"},
				}},
			},
			wantErr: "form field 0 requires formKey",
		},
		{
			name: "object list missing key",
			form: &FormComponentConfig{
				SchemaName:  "sales",
				ObjectLists: []FormObjectListConfig{{Source: "embedded"}},
			},
			wantErr: "object list 0 requires key",
		},
		{
			name: "invalid object action",
			form: &FormComponentConfig{
				SchemaName: "sales",
				ObjectLists: []FormObjectListConfig{{
					Key:     "items",
					Actions: []FormObjectActionConfig{{Kind: "archive"}},
				}},
			},
			wantErr: "invalid object action kind 'archive'",
		},
		{
			name: "increment missing field",
			form: &FormComponentConfig{
				SchemaName: "sales",
				ObjectLists: []FormObjectListConfig{{
					Key:     "items",
					Actions: []FormObjectActionConfig{{Kind: "increment"}},
				}},
			},
			wantErr: "increment action requires field",
		},
		{
			name: "add object missing target",
			form: &FormComponentConfig{
				SchemaName: "sales",
				Actions:    []FormActionConfig{{Kind: "addObject"}},
			},
			wantErr: "addObject action requires targetObjectList",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateFormComponentConfig(tt.form)
			if tt.wantErr == "" && err != nil {
				t.Fatalf("ValidateFormComponentConfig() error = %v", err)
			}
			if tt.wantErr != "" && (err == nil || !strings.Contains(err.Error(), tt.wantErr)) {
				t.Fatalf("ValidateFormComponentConfig() error = %v, want containing %q", err, tt.wantErr)
			}
		})
	}
}
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
go test ./models -run TestValidateFormComponentConfig -count=1
```

Expected: FAIL with `undefined: ValidateFormComponentConfig`.

- [ ] **Step 3: Add validation functions**

In `models/frontendValidation.go`, add these functions after `ValidateFilterPanelConfig`:

```go
func ValidateFormComponentConfig(form *FormComponentConfig) error {
	if form == nil {
		return nil
	}
	if form.SchemaName == "" {
		return fmt.Errorf("form requires schemaName")
	}
	for index, field := range form.Fields {
		if field.FormKey == "" {
			return fmt.Errorf("form field %d requires formKey", index)
		}
		if field.Type == "" {
			return fmt.Errorf("form field '%s' requires type", field.FormKey)
		}
	}
	objectListKeys := map[string]bool{}
	for index, objectList := range form.ObjectLists {
		if objectList.Key == "" {
			return fmt.Errorf("object list %d requires key", index)
		}
		objectListKeys[objectList.Key] = true
		for actionIndex, action := range objectList.Actions {
			if err := validateFormObjectActionConfig(action); err != nil {
				return fmt.Errorf("object list '%s' action %d: %w", objectList.Key, actionIndex, err)
			}
		}
	}
	for index, action := range form.Actions {
		if err := validateFormActionConfig(action, objectListKeys); err != nil {
			return fmt.Errorf("form action %d: %w", index, err)
		}
	}
	return nil
}

func validateFormObjectActionConfig(action FormObjectActionConfig) error {
	switch action.Kind {
	case "editObject", "removeObject":
		return nil
	case "increment", "decrement":
		if action.Field == "" {
			return fmt.Errorf("%s action requires field", action.Kind)
		}
		return nil
	default:
		return fmt.Errorf("invalid object action kind '%s'", action.Kind)
	}
}

func validateFormActionConfig(action FormActionConfig, objectListKeys map[string]bool) error {
	switch action.Kind {
	case "submit":
		return nil
	case "addObject":
		if action.TargetObjectList == "" {
			return fmt.Errorf("addObject action requires targetObjectList")
		}
		if len(objectListKeys) > 0 && !objectListKeys[action.TargetObjectList] {
			return fmt.Errorf("addObject targetObjectList '%s' does not match a configured object list", action.TargetObjectList)
		}
		return nil
	default:
		return fmt.Errorf("invalid form action kind '%s'", action.Kind)
	}
}
```

Update `ValidateComponentTableConfig` so it validates both table and form config and recurses through tabs. Replace the body with:

```go
func ValidateComponentTableConfig(component *ComponentBlock) error {
	if component == nil {
		return nil
	}

	if component.Type == ComponentTypeTable {
		if err := ValidateTableComponentConfig(component.Table); err != nil {
			return fmt.Errorf("component '%s': %w", component.ID, err)
		}
	}
	if component.Type == ComponentTypeForm {
		if err := ValidateFormComponentConfig(component.Form); err != nil {
			return fmt.Errorf("component '%s': %w", component.ID, err)
		}
	}

	for i := range component.Tabs {
		for j := range component.Tabs[i].Components {
			if err := ValidateComponentTableConfig(&component.Tabs[i].Components[j]); err != nil {
				return err
			}
		}
	}

	return nil
}
```

- [ ] **Step 4: Run validation tests**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
go test ./models -run 'TestValidateFormComponentConfig|TestFormComponentConfigRoundTrip' -count=1
```

Expected: PASS.

- [ ] **Step 5: Run all backend tests and commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
gofmt -w models/frontendValidation.go models/models_test.go
go test ./...
git add models/frontendValidation.go models/models_test.go
git commit -m "test: validate form component configs"
```

Expected: tests pass and commit succeeds.

---

## Task 3: Runtime TypeScript Form Config Types

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/react-template/src/types/page.ts`
- Modify: `/Users/osmansamilerdogan/Desktop/react-template/src/components/panelComponents/shared/types.ts`

- [ ] **Step 1: Add form config types**

In `src/types/page.ts`, insert these types after `TableComponentConfig`:

```ts
export type FormAreaKey = "top" | "main" | "bottom" | "left" | "right";
export type FormFieldWidth = "full" | "half" | "third";
export type FormLayoutVariant = "modal" | "page";

export interface FormAreaConfig {
  key: FormAreaKey;
  title?: string;
  order?: number;
  className?: string;
}

export interface FormLayoutConfig {
  variant?: FormLayoutVariant;
  columns?: 1 | 2 | 3;
  areas?: FormAreaConfig[];
}

export interface FormFieldConfig extends TableActionFormFieldConfig {
  area?: FormAreaKey;
  order?: number;
  width?: FormFieldWidth;
}

export interface FormObjectListDisplayConfig {
  primaryField?: string;
  primaryTemplate?: string;
  secondaryField?: string;
  secondaryTemplate?: string;
  imageField?: string;
}

export type FormObjectActionKind =
  | "editObject"
  | "removeObject"
  | "increment"
  | "decrement";

export interface FormObjectActionConfig {
  kind: FormObjectActionKind;
  label?: string;
  icon?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

export type FormActionKind = "addObject" | "submit";

export interface FormActionConfig {
  kind: FormActionKind;
  label?: string;
  buttonName?: string;
  targetObjectList?: string;
  sourceFields?: string[];
  clearSourceFields?: string[];
  preserveSourceFields?: string[];
  enabled?: boolean;
  order?: number;
}

export interface FormObjectListConfig {
  key: string;
  title?: string;
  area?: FormAreaKey;
  source?: "embedded";
  itemFields?: string[];
  addAction?: FormActionConfig;
  display?: FormObjectListDisplayConfig;
  actions?: FormObjectActionConfig[];
}

export interface FormSubmitConfig {
  buttonName?: string;
  constantValues?: Record<string, unknown>;
}

export interface FormComponentConfig {
  title?: string;
  schemaName: string;
  layout?: FormLayoutConfig;
  fields?: FormFieldConfig[];
  objectLists?: FormObjectListConfig[];
  actions?: FormActionConfig[];
  submit?: FormSubmitConfig;
}
```

Add `form?: FormComponentConfig;` to `ComponentBlock` immediately after `table?: TableComponentConfig;`:

```ts
  table?: TableComponentConfig;
  form?: FormComponentConfig;
```

- [ ] **Step 2: Widen form state values**

In `src/components/panelComponents/shared/types.ts`, replace `FormElementValue` with:

```ts
export type EmbeddedObjectValue = Record<string, unknown>;

type FormElementValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | EmbeddedObjectValue
  | EmbeddedObjectValue[]
  | Date
  | File
  | null
  | undefined;
```

- [ ] **Step 3: Build TypeScript**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
yarn build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
git add src/types/page.ts src/components/panelComponents/shared/types.ts
git commit -m "feat: add runtime form config types"
```

Expected: commit succeeds.

---

## Task 4: Runtime Form Config Helpers

**Files:**
- Create: `/Users/osmansamilerdogan/Desktop/react-template/src/utils/formConfig.ts`
- Build check: `/Users/osmansamilerdogan/Desktop/react-template`

- [ ] **Step 1: Create helper module**

Create `src/utils/formConfig.ts`:

```ts
import {
  FormActionConfig,
  FormAreaKey,
  FormComponentConfig,
  FormFieldConfig,
  FormObjectListConfig,
} from "../types/page";
import {
  FormKeyType,
  FormKeyTypeEnum,
  GenericInputType,
  InputTypes,
  OptionType,
} from "../components/panelComponents/shared/types";
import { FormElementsState } from "../types";

export type EmbeddedFormObject = Record<string, unknown>;

const inputTypeMap: Record<string, InputTypes> = {
  text: InputTypes.TEXT,
  date: InputTypes.DATE,
  number: InputTypes.NUMBER,
  select: InputTypes.SELECT,
  textarea: InputTypes.TEXTAREA,
  image: InputTypes.IMAGE,
  password: InputTypes.PASSWORD,
  time: InputTypes.TIME,
  color: InputTypes.COLOR,
  checkbox: InputTypes.CHECKBOX,
  hour: InputTypes.HOUR,
  monthYear: InputTypes.MONTHYEAR,
};

const formKeyTypeMap: Record<string, FormKeyTypeEnum> = {
  string: FormKeyTypeEnum.STRING,
  number: FormKeyTypeEnum.NUMBER,
  color: FormKeyTypeEnum.COLOR,
  date: FormKeyTypeEnum.DATE,
  boolean: FormKeyTypeEnum.BOOLEAN,
  checkbox: FormKeyTypeEnum.CHECKBOX,
  stringArray: FormKeyTypeEnum.STRING_ARRAY,
  numberArray: FormKeyTypeEnum.NUMBER_ARRAY,
  intArray: FormKeyTypeEnum.INT_ARRAY,
};

export const defaultFormKeyTypeForField = (
  field: FormFieldConfig,
): FormKeyTypeEnum => {
  if (field.formKeyType && formKeyTypeMap[field.formKeyType]) {
    return formKeyTypeMap[field.formKeyType];
  }
  if (field.isMultiple) return FormKeyTypeEnum.STRING_ARRAY;
  if (field.type === "number") return FormKeyTypeEnum.NUMBER;
  if (field.type === "checkbox") return FormKeyTypeEnum.BOOLEAN;
  if (field.type === "color") return FormKeyTypeEnum.COLOR;
  if (["date", "time", "hour", "monthYear"].includes(field.type)) {
    return FormKeyTypeEnum.DATE;
  }
  return FormKeyTypeEnum.STRING;
};

export const buildFormInputs = (
  form: FormComponentConfig,
): GenericInputType[] =>
  (form.fields || [])
    .filter((field) => field.formKey)
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
    .map((field) => ({
      type: inputTypeMap[field.type] || InputTypes.TEXT,
      formKey: field.formKey,
      label: field.label || field.formKey,
      placeholder: field.placeholder || field.label || field.formKey,
      required: !!field.required,
      requiredCondition: field.requiredCondition,
      disabledCondition: field.disabledCondition,
      isDisabled: field.isDisabled,
      isMultiple: field.isMultiple,
      isNumberButtonsActive: field.isNumberButtonsActive,
      options: buildStaticOptions(field),
      sourceFilterCondition: field.sourceFilterCondition,
      invalidateKeys: field.invalidateKeys?.map((key) => ({
        key,
        defaultValue: "",
      })),
      min: field.min,
      max: field.max,
      minLength: field.minLength,
      maxLength: field.maxLength,
      pattern: field.pattern,
      validationMessage: field.validationMessage,
    }));

export const buildFormKeys = (form: FormComponentConfig): FormKeyType[] => [
  ...(form.fields || [])
    .filter((field) => field.formKey)
    .map((field) => ({
      key: field.formKey,
      type: defaultFormKeyTypeForField(field),
    })),
  ...(form.objectLists || []).map((objectList) => ({
    key: objectList.key,
    type: FormKeyTypeEnum.STRING_ARRAY,
  })),
];

export const getFieldArea = (field: FormFieldConfig): FormAreaKey =>
  field.area || "main";

export const getObjectListArea = (
  objectList: FormObjectListConfig,
): FormAreaKey => objectList.area || "right";

export const normalizeObjectListValue = (
  value: unknown,
): EmbeddedFormObject[] =>
  Array.isArray(value)
    ? value.filter(
        (item): item is EmbeddedFormObject =>
          item !== null && typeof item === "object" && !Array.isArray(item),
      )
    : [];

export const resolveTemplate = (
  template: string | undefined,
  item: EmbeddedFormObject,
): string => {
  if (!template?.trim()) return "";
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, key: string) => {
    const value = item[key.trim()];
    return value === undefined || value === null ? "" : String(value);
  });
};

export const getObjectDisplayText = (
  item: EmbeddedFormObject,
  field?: string,
  template?: string,
): string => {
  const resolvedTemplate = resolveTemplate(template, item);
  if (resolvedTemplate) return resolvedTemplate;
  if (!field) return "";
  const value = item[field];
  return value === undefined || value === null ? "" : String(value);
};

export const findSubmitAction = (
  form: FormComponentConfig,
): FormActionConfig | undefined =>
  (form.actions || []).find(
    (action) => action.enabled !== false && action.kind === "submit",
  );

export const findAddObjectActions = (
  form: FormComponentConfig,
): FormActionConfig[] =>
  (form.actions || [])
    .filter((action) => action.enabled !== false && action.kind === "addObject")
    .slice()
    .sort((left, right) => (left.order ?? 0) - (right.order ?? 0));

const buildStaticOptions = (field: FormFieldConfig): OptionType[] => {
  if (field.staticOptions?.length) {
    return field.staticOptions.map((option) => ({
      value: option.value,
      label: option.label,
    }));
  }
  if (!field.staticOptionsJson?.trim()) return [];
  try {
    const parsed = JSON.parse(field.staticOptionsJson);
    return Array.isArray(parsed)
      ? parsed
          .filter((item) => item && item.value !== undefined)
          .map((item) => ({
            value: item.value,
            label: String(item.label ?? item.value),
          }))
      : [];
  } catch {
    return [];
  }
};

export const copySourceFieldsToObject = (
  formElements: FormElementsState,
  sourceFields: string[] = [],
): EmbeddedFormObject =>
  sourceFields.reduce<EmbeddedFormObject>((item, field) => {
    item[field] = formElements[field];
    return item;
  }, {});
```

- [ ] **Step 2: Build TypeScript**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
yarn build
```

Expected: PASS.

- [ ] **Step 3: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
git add src/utils/formConfig.ts
git commit -m "feat: add dynamic form config helpers"
```

Expected: commit succeeds.

---

## Task 5: Runtime DynamicForm Component

**Files:**
- Create: `/Users/osmansamilerdogan/Desktop/react-template/src/components/forms/DynamicForm.tsx`
- Verify unchanged behavior: `/Users/osmansamilerdogan/Desktop/react-template/src/components/panelComponents/FormElements/GenericAddEditPanel.tsx`

- [ ] **Step 1: Create `DynamicForm`**

Create `src/components/forms/DynamicForm.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { FormComponentConfig, FormObjectListConfig } from "../../types/page";
import { FormElementsState, NO_IMAGE_URL } from "../../types";
import {
  buildFormInputs,
  buildFormKeys,
  copySourceFieldsToObject,
  findAddObjectActions,
  findSubmitAction,
  getFieldArea,
  getObjectDisplayText,
  getObjectListArea,
  normalizeObjectListValue,
} from "../../utils/formConfig";
import { post } from "../../utils/api";
import { GenericButton } from "../panelComponents/FormElements/GenericButton";
import TextInput from "../panelComponents/FormElements/TextInput";
import DateInput from "../panelComponents/FormElements/DateInput";
import SelectInput from "../panelComponents/FormElements/SelectInput";
import { InputTypes } from "../panelComponents/shared/types";

type Props = {
  form: FormComponentConfig;
  title?: string;
};

type EditingState = {
  listKey: string;
  index: number;
} | null;

const areaOrder = ["top", "left", "main", "right", "bottom"] as const;

const defaultValueForType = (type: string) => {
  if (type === "number") return null;
  if (type === "boolean" || type === "checkbox") return false;
  if (type === "stringArray" || type === "numberArray" || type === "intArray") {
    return [];
  }
  return "";
};

const buildInitialState = (form: FormComponentConfig): FormElementsState => {
  const state = buildFormKeys(form).reduce<FormElementsState>((acc, formKey) => {
    acc[formKey.key] = defaultValueForType(String(formKey.type));
    return acc;
  }, {});
  (form.fields || []).forEach((field) => {
    if (field.defaultValue !== undefined) {
      state[field.formKey] = field.defaultValue;
    }
  });
  (form.objectLists || []).forEach((objectList) => {
    state[objectList.key] = [];
  });
  return state;
};

const DynamicForm = ({ form, title }: Props) => {
  const { t } = useTranslation();
  const inputs = useMemo(() => buildFormInputs(form), [form]);
  const addObjectActions = useMemo(() => findAddObjectActions(form), [form]);
  const submitAction = useMemo(() => findSubmitAction(form), [form]);
  const [formElements, setFormElements] = useState<FormElementsState>(() =>
    buildInitialState(form),
  );
  const [editing, setEditing] = useState<EditingState>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (key: string, value: unknown) => {
    setFormElements((current) => ({ ...current, [key]: value }));
  };

  const clearFields = (keys: string[] = []) => {
    setFormElements((current) => {
      const next = { ...current };
      keys.forEach((key) => {
        const field = buildFormKeys(form).find((item) => item.key === key);
        next[key] = defaultValueForType(String(field?.type || "string"));
      });
      return next;
    });
  };

  const handleAddObject = (targetObjectList: string, sourceFields: string[]) => {
    const item = copySourceFieldsToObject(formElements, sourceFields);
    if (Object.keys(item).length === 0) {
      toast.error(t("No fields configured for this action"));
      return;
    }
    setFormElements((current) => {
      const currentItems = normalizeObjectListValue(current[targetObjectList]);
      const nextItems =
        editing?.listKey === targetObjectList
          ? currentItems.map((existing, index) =>
              index === editing.index ? item : existing,
            )
          : [...currentItems, item];
      return { ...current, [targetObjectList]: nextItems };
    });
    setEditing(null);
  };

  const handleEditObject = (
    objectList: FormObjectListConfig,
    item: Record<string, unknown>,
    index: number,
  ) => {
    setFormElements((current) => {
      const next = { ...current };
      (objectList.itemFields || Object.keys(item)).forEach((field) => {
        next[field] = item[field] as FormElementsState[string];
      });
      return next;
    });
    setEditing({ listKey: objectList.key, index });
  };

  const handleRemoveObject = (objectList: FormObjectListConfig, index: number) => {
    setFormElements((current) => ({
      ...current,
      [objectList.key]: normalizeObjectListValue(current[objectList.key]).filter(
        (_item, itemIndex) => itemIndex !== index,
      ),
    }));
  };

  const handleNumberObjectAction = (
    objectList: FormObjectListConfig,
    index: number,
    field: string,
    delta: number,
    min?: number,
    max?: number,
  ) => {
    setFormElements((current) => ({
      ...current,
      [objectList.key]: normalizeObjectListValue(current[objectList.key]).map(
        (item, itemIndex) => {
          if (itemIndex !== index) return item;
          const currentValue = Number(item[field] ?? 0);
          const nextValue = Math.min(
            max ?? Number.POSITIVE_INFINITY,
            Math.max(min ?? Number.NEGATIVE_INFINITY, currentValue + delta),
          );
          return { ...item, [field]: nextValue };
        },
      ),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await post({
        path: `/dynamic?schemaName=${form.schemaName}`,
        body: {
          ...formElements,
          ...(form.submit?.constantValues || {}),
        },
      });
      toast.success(t("Saved"));
      setFormElements(buildInitialState(form));
      setEditing(null);
    } catch (error) {
      console.error("Failed to submit dynamic form", error);
      toast.error(t("Failed to save"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInput = (input: (typeof inputs)[number]) => {
    const value = formElements[input.formKey];
    if (
      input.type === InputTypes.TEXT ||
      input.type === InputTypes.NUMBER ||
      input.type === InputTypes.TEXTAREA ||
      input.type === InputTypes.CHECKBOX ||
      input.type === InputTypes.COLOR ||
      input.type === InputTypes.PASSWORD ||
      input.type === InputTypes.TIME
    ) {
      return (
        <TextInput
          key={input.formKey}
          type={input.type}
          value={value}
          label={input.label || input.formKey}
          placeholder={input.placeholder || ""}
          requiredField={input.required}
          isNumberButtonsActive={input.isNumberButtonsActive}
          onChange={(nextValue) => updateField(input.formKey, nextValue)}
        />
      );
    }
    if (input.type === InputTypes.DATE) {
      return (
        <DateInput
          key={input.formKey}
          value={value}
          label={input.label || input.formKey}
          placeholder={input.placeholder || ""}
          requiredField={input.required}
          onChange={(nextValue) => updateField(input.formKey, nextValue || "")}
        />
      );
    }
    if (input.type === InputTypes.SELECT) {
      return (
        <SelectInput
          key={input.formKey}
          value={
            input.isMultiple
              ? (input.options || []).filter((option) =>
                  Array.isArray(value) ? value.includes(option.value) : false,
                )
              : (input.options || []).find((option) => option.value === value) ||
                null
          }
          label={input.label || input.formKey}
          options={input.options || []}
          placeholder={input.placeholder || ""}
          isMultiple={input.isMultiple}
          requiredField={input.required}
          onChange={(selectedValue) => {
            if (Array.isArray(selectedValue)) {
              updateField(
                input.formKey,
                selectedValue.map((option) => option.value),
              );
              return;
            }
            updateField(input.formKey, selectedValue?.value || "");
          }}
        />
      );
    }
    return null;
  };

  const renderObjectList = (objectList: FormObjectListConfig) => {
    const items = normalizeObjectListValue(formElements[objectList.key]);
    return (
      <div className="rounded-md border border-gray-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{objectList.title || objectList.key}</h3>
          <span className="text-sm text-gray-500">{items.length}</span>
        </div>
        <div className="divide-y divide-gray-200">
          {items.map((item, index) => {
            const display = objectList.display || {};
            const primary = getObjectDisplayText(
              item,
              display.primaryField,
              display.primaryTemplate,
            );
            const secondary = getObjectDisplayText(
              item,
              display.secondaryField,
              display.secondaryTemplate,
            );
            const imageValue = display.imageField
              ? String(item[display.imageField] || NO_IMAGE_URL)
              : "";
            return (
              <div key={`${objectList.key}-${index}`} className="flex items-center gap-3 py-3">
                {imageValue && (
                  <img
                    src={imageValue}
                    alt=""
                    className="h-12 w-12 rounded-md object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{primary || "-"}</div>
                  {secondary && <div className="text-sm text-gray-500">{secondary}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {(objectList.actions || []).map((action, actionIndex) => {
                    if (action.kind === "editObject") {
                      return (
                        <GenericButton
                          key={actionIndex}
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEditObject(objectList, item, index)}
                        >
                          {t(action.label || "Edit")}
                        </GenericButton>
                      );
                    }
                    if (action.kind === "removeObject") {
                      return (
                        <GenericButton
                          key={actionIndex}
                          variant="danger"
                          size="sm"
                          onClick={() => handleRemoveObject(objectList, index)}
                        >
                          {t(action.label || "Remove")}
                        </GenericButton>
                      );
                    }
                    if (action.kind === "increment" && action.field) {
                      return (
                        <GenericButton
                          key={actionIndex}
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleNumberObjectAction(
                              objectList,
                              index,
                              action.field!,
                              action.step || 1,
                              action.min,
                              action.max,
                            )
                          }
                        >
                          +
                        </GenericButton>
                      );
                    }
                    if (action.kind === "decrement" && action.field) {
                      return (
                        <GenericButton
                          key={actionIndex}
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            handleNumberObjectAction(
                              objectList,
                              index,
                              action.field!,
                              -(action.step || 1),
                              action.min,
                              action.max,
                            )
                          }
                        >
                          -
                        </GenericButton>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderArea = (area: (typeof areaOrder)[number]) => {
    const areaInputs = inputs.filter((input) => {
      const field = (form.fields || []).find((item) => item.formKey === input.formKey);
      return getFieldArea(field || { formKey: input.formKey, type: "text" }) === area;
    });
    const areaLists = (form.objectLists || []).filter(
      (objectList) => getObjectListArea(objectList) === area,
    );
    if (areaInputs.length === 0 && areaLists.length === 0) return null;
    return (
      <div className="flex flex-col gap-4">
        {areaInputs.map(renderInput)}
        {addObjectActions
          .filter((action) => action.targetObjectList)
          .map((action, index) => (
            <GenericButton
              key={`${action.targetObjectList}-${index}`}
              variant="secondary"
              size="md"
              onClick={() => {
                handleAddObject(
                  action.targetObjectList!,
                  action.sourceFields || [],
                );
                clearFields(action.clearSourceFields || []);
              }}
            >
              {editing ? t("Save Item") : t(action.buttonName || action.label || "Add")}
            </GenericButton>
          ))}
        {areaLists.map((objectList) => (
          <div key={objectList.key}>{renderObjectList(objectList)}</div>
        ))}
      </div>
    );
  };

  if (!form.schemaName) {
    return (
      <div className="rounded border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
        {t("Form component requires schemaName.")}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-gray-200 bg-white p-5">
          <h2 className="mb-4 text-xl font-semibold">
            {form.title || title || t("Form")}
          </h2>
          {renderArea("top")}
          {renderArea("main")}
          {renderArea("bottom")}
        </div>
        <div className="flex flex-col gap-4">
          {renderArea("left")}
          {renderArea("right")}
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <GenericButton
          variant="primary"
          size="md"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {t(
            submitAction?.buttonName ||
              submitAction?.label ||
              form.submit?.buttonName ||
              "Save",
          )}
        </GenericButton>
      </div>
    </div>
  );
};

export default DynamicForm;
```

- [ ] **Step 2: Verify the dynamic create API helper**

Inspect `src/utils/api.ts` and replace the `post` call in `handleSubmit` with the existing project helper signature. The final `handleSubmit` must send `formElements` plus `form.submit.constantValues` to the configured `form.schemaName`. If the helper is named `create` or `postDynamicItem`, use that helper and keep the payload shape identical:

```ts
{
  ...formElements,
  ...(form.submit?.constantValues || {}),
}
```

- [ ] **Step 3: Build**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
yarn build
```

Expected: PASS after adapting imports/API helper signatures to the existing code.

- [ ] **Step 4: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
git add src/components/forms/DynamicForm.tsx
git commit -m "feat: render dynamic form components"
```

Expected: commit succeeds.

---

## Task 6: Wire DynamicForm Into Page Rendering

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/react-template/src/components/DynamicPageSections.tsx`

- [ ] **Step 1: Import DynamicForm**

Add the lazy import near the existing chart/calendar lazy imports:

```ts
const DynamicForm = lazy(() => import("./forms/DynamicForm"));
```

- [ ] **Step 2: Render form components**

In the `RenderComponent` switch in `DynamicPageSections.tsx`, add this case before the table case or after it:

```tsx
    case "form": {
      const formConfig =
        component.form ||
        (props?.form as ComponentBlock["form"] | undefined);
      return formConfig ? (
        <DynamicForm form={formConfig} title={title} />
      ) : (
        <NoticePanel tone="warning">
          Form component requires form configuration.
        </NoticePanel>
      );
    }
```

Make sure `ComponentBlock` is already imported from `../types/page`; if it is not available in the local scope, import `FormComponentConfig` and cast to that instead.

- [ ] **Step 3: Build**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
yarn build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
git add src/components/DynamicPageSections.tsx
git commit -m "feat: route form page components"
```

Expected: commit succeeds.

---

## Task 7: tenantPanel Form Types

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/tenantPanel/src/types/page.ts`
- Modify: `/Users/osmansamilerdogan/Desktop/tenantPanel/src/utils/api/page.ts`

- [ ] **Step 1: Add tenant `src/types/page.ts` form types**

Mirror the `react-template/src/types/page.ts` types from Task 3 in `tenantPanel/src/types/page.ts` after `TableComponentConfig`, using the same names:

```ts
export type FormAreaKey = "top" | "main" | "bottom" | "left" | "right";
export type FormFieldWidth = "full" | "half" | "third";
export type FormLayoutVariant = "modal" | "page";

export interface FormAreaConfig {
  key: FormAreaKey;
  title?: string;
  order?: number;
  className?: string;
}

export interface FormLayoutConfig {
  variant?: FormLayoutVariant;
  columns?: 1 | 2 | 3;
  areas?: FormAreaConfig[];
}

export interface FormFieldConfig extends TableActionFormFieldConfig {
  area?: FormAreaKey;
  order?: number;
  width?: FormFieldWidth;
}

export interface FormObjectListDisplayConfig {
  primaryField?: string;
  primaryTemplate?: string;
  secondaryField?: string;
  secondaryTemplate?: string;
  imageField?: string;
}

export type FormObjectActionKind =
  | "editObject"
  | "removeObject"
  | "increment"
  | "decrement";

export interface FormObjectActionConfig {
  kind: FormObjectActionKind;
  label?: string;
  icon?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

export type FormActionKind = "addObject" | "submit";

export interface FormActionConfig {
  kind: FormActionKind;
  label?: string;
  buttonName?: string;
  targetObjectList?: string;
  sourceFields?: string[];
  clearSourceFields?: string[];
  preserveSourceFields?: string[];
  enabled?: boolean;
  order?: number;
}

export interface FormObjectListConfig {
  key: string;
  title?: string;
  area?: FormAreaKey;
  source?: "embedded";
  itemFields?: string[];
  addAction?: FormActionConfig;
  display?: FormObjectListDisplayConfig;
  actions?: FormObjectActionConfig[];
}

export interface FormSubmitConfig {
  buttonName?: string;
  constantValues?: Record<string, unknown>;
}

export interface FormComponentConfig {
  title?: string;
  schemaName: string;
  layout?: FormLayoutConfig;
  fields?: FormFieldConfig[];
  objectLists?: FormObjectListConfig[];
  actions?: FormActionConfig[];
  submit?: FormSubmitConfig;
}
```

Add `form?: FormComponentConfig;` to `ComponentBlock` after `table?: TableComponentConfig;`.

- [ ] **Step 2: Add API form interfaces**

In `tenantPanel/src/utils/api/page.ts`, add API interfaces after `PageTableComponentConfig`:

```ts
export type PageFormAreaKey = "top" | "main" | "bottom" | "left" | "right";

export interface PageFormAreaConfig {
  key: PageFormAreaKey;
  title?: string;
  order?: number;
  className?: string;
}

export interface PageFormLayoutConfig {
  variant?: string;
  columns?: number;
  areas?: PageFormAreaConfig[];
}

export interface PageFormFieldConfig extends PageTableActionFormFieldConfig {
  area?: PageFormAreaKey;
  order?: number;
  width?: string;
}

export interface PageFormObjectListDisplayConfig {
  primaryField?: string;
  primaryTemplate?: string;
  secondaryField?: string;
  secondaryTemplate?: string;
  imageField?: string;
}

export interface PageFormObjectActionConfig {
  kind: string;
  label?: string;
  icon?: string;
  field?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface PageFormActionConfig {
  kind: string;
  label?: string;
  buttonName?: string;
  targetObjectList?: string;
  sourceFields?: string[];
  clearSourceFields?: string[];
  preserveSourceFields?: string[];
  enabled?: boolean;
  order?: number;
}

export interface PageFormObjectListConfig {
  key: string;
  title?: string;
  area?: PageFormAreaKey;
  source?: string;
  itemFields?: string[];
  addAction?: PageFormActionConfig;
  display?: PageFormObjectListDisplayConfig;
  actions?: PageFormObjectActionConfig[];
}

export interface PageFormSubmitConfig {
  buttonName?: string;
  constantValues?: Record<string, unknown>;
}

export interface PageFormComponentConfig {
  title?: string;
  schemaName: string;
  layout?: PageFormLayoutConfig;
  fields?: PageFormFieldConfig[];
  objectLists?: PageFormObjectListConfig[];
  actions?: PageFormActionConfig[];
  submit?: PageFormSubmitConfig;
}
```

Add `form?: PageFormComponentConfig;` to the API `ComponentBlock` after `table?: PageTableComponentConfig;`.

- [ ] **Step 3: Build tenantPanel**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
yarn build
```

Expected: PASS.

- [ ] **Step 4: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
git add src/types/page.ts src/utils/api/page.ts
git commit -m "feat: add form component page types"
```

Expected: commit succeeds.

---

## Task 8: tenantPanel PageDesigner Form State and Payload

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/tenantPanel/src/components/PageDesigner/PageDesigner.tsx`

- [ ] **Step 1: Update imports**

Add these imports from `../../types/page`:

```ts
  FormActionConfig,
  FormAreaKey,
  FormComponentConfig,
  FormFieldConfig,
  FormObjectActionConfig,
  FormObjectListConfig,
```

- [ ] **Step 2: Add constants**

Add after `ACTION_OPTIONS_SOURCES`:

```ts
const FORM_AREAS: { value: FormAreaKey; label: string }[] = [
  { value: "top", label: "Top" },
  { value: "main", label: "Main" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
];

const FORM_FIELD_WIDTHS = [
  { value: "full", label: "Full" },
  { value: "half", label: "Half" },
  { value: "third", label: "Third" },
];

const FORM_OBJECT_ACTIONS: { value: FormObjectActionConfig["kind"]; label: string }[] = [
  { value: "editObject", label: "Edit item" },
  { value: "removeObject", label: "Remove item" },
  { value: "increment", label: "Increment" },
  { value: "decrement", label: "Decrement" },
];
```

- [ ] **Step 3: Add form config builders**

Add near existing `buildActionFormFieldsFromFields` helpers:

```ts
const buildFormFieldsFromFields = (fields: Field[]): FormFieldConfig[] =>
  buildActionFormFieldsFromFields(fields).map((field, index) => ({
    ...field,
    area: "main",
    order: index + 1,
    width: "full",
  }));

const buildDefaultFormConfig = (
  schemaName: string,
  fields: Field[],
): FormComponentConfig => ({
  title: "",
  schemaName,
  layout: {
    variant: "page",
    columns: 2,
    areas: [
      { key: "main", title: "Form", order: 1 },
      { key: "right", title: "Items", order: 2 },
    ],
  },
  fields: buildFormFieldsFromFields(fields),
  objectLists: [],
  actions: [
    {
      kind: "submit",
      buttonName: "Save",
      order: 1,
      enabled: true,
    },
  ],
});
```

- [ ] **Step 4: Add cleaning helpers**

Add near existing `cleanTableConfig` helpers:

```ts
const cleanFormConfig = (form: FormComponentConfig): FormComponentConfig => ({
  title: form.title || "",
  schemaName: form.schemaName,
  layout: {
    variant: form.layout?.variant || "page",
    columns: form.layout?.columns || 2,
    areas: (form.layout?.areas || []).filter((area) => area.key),
  },
  fields: (form.fields || [])
    .filter((field) => field.formKey && field.type)
    .map((field) => ({
      ...field,
      label: field.label || field.formKey,
      placeholder: field.placeholder || "",
      area: field.area || "main",
      order: field.order || 0,
      width: field.width || "full",
    })),
  objectLists: (form.objectLists || [])
    .filter((objectList) => objectList.key)
    .map((objectList) => ({
      ...objectList,
      source: "embedded",
      itemFields: (objectList.itemFields || []).filter(Boolean),
      actions: (objectList.actions || []).filter((action) => action.kind),
      display: objectList.display || {},
    })),
  actions: (form.actions || [])
    .filter((action) => action.kind)
    .map((action) => ({
      ...action,
      enabled: action.enabled !== false,
      sourceFields: (action.sourceFields || []).filter(Boolean),
      clearSourceFields: (action.clearSourceFields || []).filter(Boolean),
      preserveSourceFields: (action.preserveSourceFields || []).filter(Boolean),
    })),
  submit: form.submit,
});
```

- [ ] **Step 5: Add component modal state**

Inside the component editor modal state section, add:

```ts
const [formConfig, setFormConfig] = useState<FormComponentConfig>(
  buildDefaultFormConfig("", []),
);
```

When `schemaName` changes and `componentType === "form"`, set default form config with selected container fields:

```ts
if (componentType === "form") {
  const nextContainer = containers.find((item) => item.schemaName === e.target.value);
  setFormConfig(buildDefaultFormConfig(e.target.value, nextContainer?.fields || []));
}
```

- [ ] **Step 6: Save form config in component payload**

Where the editor builds `component: ComponentBlock`, add:

```ts
if (componentType === "form") {
  component.dataBinding = {
    kind: "schema",
    schemaName: formConfig.schemaName || schemaName,
  };
  component.form = cleanFormConfig({
    ...formConfig,
    schemaName: formConfig.schemaName || schemaName,
    title,
  });
}
```

- [ ] **Step 7: Hydrate existing form config**

In the edit-component hydration effect, when `editingComponent.type === "form"`, set:

```ts
setSchemaName(editingComponent.form?.schemaName || editingComponent.dataBinding?.schemaName || "");
setFormConfig(
  editingComponent.form ||
    buildDefaultFormConfig(
      editingComponent.dataBinding?.schemaName || "",
      selectedFields,
    ),
);
```

- [ ] **Step 8: Build tenantPanel**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
yarn build
```

Expected: PASS after adapting exact insertion points to the current PageDesigner structure.

- [ ] **Step 9: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
git add src/components/PageDesigner/PageDesigner.tsx
git commit -m "feat: save form component configs from designer"
```

Expected: commit succeeds.

---

## Task 9: tenantPanel PageDesigner Form Editing UI

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/tenantPanel/src/components/PageDesigner/PageDesigner.tsx`

- [ ] **Step 1: Add Form option to component type select**

In the component type `<select>`, add:

```tsx
<option value="form">Form</option>
```

- [ ] **Step 2: Add form field update helpers**

Add near table action helper functions:

```ts
const updateFormField = (
  fieldIndex: number,
  updates: Partial<FormFieldConfig>,
) => {
  setFormConfig((current) => {
    const fields = [...(current.fields || [])];
    fields[fieldIndex] = { ...fields[fieldIndex], ...updates };
    return { ...current, fields };
  });
};

const addFormObjectList = () => {
  setFormConfig((current) => ({
    ...current,
    objectLists: [
      ...(current.objectLists || []),
      {
        key: "items",
        title: "Items",
        area: "right",
        source: "embedded",
        itemFields: [],
        display: {
          primaryField: "",
          secondaryTemplate: "",
          imageField: "",
        },
        actions: [
          { kind: "editObject", label: "Edit" },
          { kind: "removeObject", label: "Remove" },
        ],
      },
    ],
  }));
};

const updateFormObjectList = (
  listIndex: number,
  updates: Partial<FormObjectListConfig>,
) => {
  setFormConfig((current) => ({
    ...current,
    objectLists: (current.objectLists || []).map((objectList, index) =>
      index === listIndex ? { ...objectList, ...updates } : objectList,
    ),
  }));
};

const removeFormObjectList = (listIndex: number) => {
  setFormConfig((current) => ({
    ...current,
    objectLists: (current.objectLists || []).filter(
      (_objectList, index) => index !== listIndex,
    ),
  }));
};

const addFormAddObjectAction = (targetObjectList: string) => {
  setFormConfig((current) => ({
    ...current,
    actions: [
      ...(current.actions || []).filter((action) => action.kind !== "addObject"),
      {
        kind: "addObject",
        label: "+ Add",
        targetObjectList,
        sourceFields: [],
        clearSourceFields: [],
        enabled: true,
        order: 1,
      },
      ...(current.actions || []).filter((action) => action.kind === "submit"),
    ],
  }));
};
```

- [ ] **Step 3: Add form editor panel**

Inside the modal body after the data binding section and before table-only panels, add:

```tsx
{componentType === "form" && (
  <div className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <input
        type="text"
        value={formConfig.title || ""}
        onChange={(e) =>
          setFormConfig((current) => ({ ...current, title: e.target.value }))
        }
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg"
        placeholder="Form title"
      />
      <select
        value={formConfig.layout?.columns || 2}
        onChange={(e) =>
          setFormConfig((current) => ({
            ...current,
            layout: {
              ...(current.layout || {}),
              variant: "page",
              columns: Number(e.target.value) as 1 | 2 | 3,
            },
          }))
        }
        className="w-full px-3.5 py-2.5 text-sm bg-white border border-neutral-300 rounded-lg"
      >
        <option value={1}>1 column</option>
        <option value={2}>2 columns</option>
        <option value={3}>3 columns</option>
      </select>
      <button
        type="button"
        onClick={addFormObjectList}
        className="px-3.5 py-2.5 text-sm font-medium rounded-lg border border-neutral-300 hover:bg-neutral-50"
      >
        Add Object List
      </button>
    </div>

    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-neutral-800">Fields</h4>
      {(formConfig.fields || []).map((field, fieldIndex) => (
        <div
          key={`${field.formKey}-${fieldIndex}`}
          className="grid grid-cols-1 md:grid-cols-5 gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3"
        >
          <input
            type="text"
            value={field.label || ""}
            onChange={(e) => updateFormField(fieldIndex, { label: e.target.value })}
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
            placeholder="Label"
          />
          <select
            value={field.area || "main"}
            onChange={(e) =>
              updateFormField(fieldIndex, { area: e.target.value as FormAreaKey })
            }
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
          >
            {FORM_AREAS.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
          <select
            value={field.width || "full"}
            onChange={(e) =>
              updateFormField(fieldIndex, {
                width: e.target.value as FormFieldConfig["width"],
              })
            }
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
          >
            {FORM_FIELD_WIDTHS.map((width) => (
              <option key={width.value} value={width.value}>
                {width.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={field.order || fieldIndex + 1}
            onChange={(e) =>
              updateFormField(fieldIndex, { order: Number(e.target.value) })
            }
            className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!field.required}
              onChange={(e) =>
                updateFormField(fieldIndex, { required: e.target.checked })
              }
            />
            Required
          </label>
        </div>
      ))}
    </div>

    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-neutral-800">Object Lists</h4>
      {(formConfig.objectLists || []).map((objectList, listIndex) => (
        <div key={`${objectList.key}-${listIndex}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              value={objectList.key}
              onChange={(e) =>
                updateFormObjectList(listIndex, { key: e.target.value })
              }
              className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              placeholder="items"
            />
            <input
              type="text"
              value={objectList.title || ""}
              onChange={(e) =>
                updateFormObjectList(listIndex, { title: e.target.value })
              }
              className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
              placeholder="List title"
            />
            <select
              value={objectList.area || "right"}
              onChange={(e) =>
                updateFormObjectList(listIndex, {
                  area: e.target.value as FormAreaKey,
                })
              }
              className="px-3 py-2 text-sm border border-neutral-300 rounded-lg"
            >
              {FORM_AREAS.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => removeFormObjectList(listIndex)}
              className="px-3 py-2 text-sm rounded-lg border border-red-200 text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
          <button
            type="button"
            onClick={() => addFormAddObjectAction(objectList.key)}
            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-white"
          >
            Use Add Object Action
          </button>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 4: Build tenantPanel**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
yarn build
```

Expected: PASS. If the component file becomes too difficult to type-check because of local helper placement, extract the form editor UI into `src/components/PageDesigner/FormComponentEditor.tsx` and import it from PageDesigner.

- [ ] **Step 5: Commit**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
git add src/components/PageDesigner/PageDesigner.tsx
git commit -m "feat: edit form components in page designer"
```

Expected: commit succeeds.

---

## Task 10: Preview and Final Verification

**Files:**
- Modify: `/Users/osmansamilerdogan/Desktop/tenantPanel/src/pages/PagePreviewPage.tsx`
- Verify: all three repositories

- [ ] **Step 1: Add tenantPanel summary preview support**

In `PagePreviewPage.tsx`, add a `case "form"` branch to the local component renderer. Use this summary preview:

```tsx
case "form":
  return component.form ? (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-neutral-900">
        {component.form.title || component.title || "Form"}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        {component.form.fields?.length || 0} fields,{" "}
        {component.form.objectLists?.length || 0} object lists
      </p>
    </div>
  ) : (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
      Form component requires configuration.
    </div>
  );
```

- [ ] **Step 2: Run backend tests**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/autotable-Go
go test ./...
```

Expected: PASS.

- [ ] **Step 3: Build react-template**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/react-template
yarn build
```

Expected: PASS.

- [ ] **Step 4: Build tenantPanel**

Run:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
yarn build
```

Expected: PASS.

- [ ] **Step 5: Manual verification**

Create a page in tenantPanel with:

```json
{
  "type": "form",
  "form": {
    "title": "Satış Detayları",
    "schemaName": "sales",
    "fields": [
      { "formKey": "saleDate", "type": "date", "formKeyType": "date", "label": "Satış Tarihi", "area": "main", "order": 1 },
      { "formKey": "product", "type": "select", "formKeyType": "string", "label": "Ürün Seç", "area": "main", "order": 2 },
      { "formKey": "quantity", "type": "number", "formKeyType": "number", "label": "Adet", "area": "main", "order": 3, "defaultValue": 1 },
      { "formKey": "note", "type": "textarea", "formKeyType": "string", "label": "Not", "area": "main", "order": 4 }
    ],
    "objectLists": [
      {
        "key": "items",
        "title": "Sepet",
        "area": "right",
        "source": "embedded",
        "itemFields": ["product", "quantity", "note"],
        "display": {
          "primaryField": "product",
          "secondaryTemplate": "{{quantity}} adet"
        },
        "actions": [
          { "kind": "editObject", "label": "Edit" },
          { "kind": "removeObject", "label": "Remove" },
          { "kind": "increment", "field": "quantity", "step": 1 },
          { "kind": "decrement", "field": "quantity", "min": 1, "step": 1 }
        ]
      }
    ],
    "actions": [
      {
        "kind": "addObject",
        "label": "+ Sepete Ekle",
        "targetObjectList": "items",
        "sourceFields": ["product", "quantity", "note"],
        "clearSourceFields": ["product", "quantity", "note"]
      },
      { "kind": "submit", "buttonName": "Satışı Kaydet" }
    ]
  }
}
```

Verify:

- The form renders with input fields on the left and the object list on the right.
- Add object copies product, quantity, and note into `items`.
- Edit object loads the item back into the form fields.
- Saving an edited item replaces the original object.
- Remove deletes only the selected item.
- Increment and decrement update quantity and decrement does not go below `1`.
- Final save sends a parent record with `items: [...]`.

- [ ] **Step 6: Final commit**

Commit preview or final verification fixes:

```bash
cd /Users/osmansamilerdogan/Desktop/tenantPanel
git add src/pages/PagePreviewPage.tsx
git commit -m "feat: preview form page components"
```

Expected: commit succeeds.

---

## Self-Review Notes

- Spec coverage:
  - Backend metadata and validation: Tasks 1 and 2.
  - Runtime form renderer, field areas, embedded object lists, and local actions: Tasks 3 through 6.
  - tenantPanel builder support: Tasks 7 through 9.
  - Preview and verification: Task 10.
- Placeholder scan:
  - This plan intentionally uses exact paths, command lines, expected results, and concrete code snippets.
- Type consistency:
  - Backend uses `FormComponentConfig`.
  - Runtime uses `FormComponentConfig`.
  - tenant API uses `PageFormComponentConfig`.
  - Component payload field is consistently named `form`.

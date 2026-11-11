// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import { createElement, useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneralContextProvider } from "../../context/General.context";
import { PageRuntimeProvider } from "../../pageRuntime/PageRuntimeProvider";
import { PageRequestConsumerProvider } from "../../pageRuntime/requests/ConsumerProvider";
import type {
  ComponentBlock,
  FormComponentConfig,
  PageModel,
} from "../../types/page";
import { axiosClient } from "../../utils/api/axiosClient";
import { parseRequestFiltersInput } from "../../utils/requestFilterTemplates";
import {
  buildConfiguredFilterInputs,
  useFilterPanelSelectionData,
} from "../../utils/tableFilters";
import GenericAddEditPanel from "../panelComponents/FormElements/GenericAddEditPanel";
import FilterPanel from "../panelComponents/Tables/FilterPanel";
import {
  FormKeyTypeEnum,
  GenericInputType,
  InputTypes,
} from "../panelComponents/shared/types";
import DynamicForm from "./DynamicForm";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const originalAdapter = axiosClient.defaults.adapter;

afterEach(() => {
  cleanup();
  axiosClient.defaults.adapter = originalAdapter;
});

const createTestClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const selectOption = async (label: string, optionText: string) => {
  const input = screen.getByLabelText(label);
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.click(await screen.findByText(optionText));
};

describe("dependent select runtime option loading and clearing", () => {
  it("waits when references are missing, projects referenced record fields, suppresses sole-option autofill, and clears descendants on change", async () => {
    window.history.replaceState(null, "", "/t/acme/p/ops/counts");
    const requests: string[] = [];

    axiosClient.defaults.adapter = async (config) => {
      const url = new URL(config.url || "", "https://runtime.invalid");
      requests.push(`${url.pathname}?${url.searchParams.toString()}`);
      const schema = url.searchParams.get("schemaName");
      if (schema === "locations") {
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: [
            { _id: "loc-1", name: "Main Warehouse", region: { code: "EU" } },
            { _id: "loc-2", name: "Annex", region: { code: "US" } },
          ],
        };
      }
      if (schema === "count_lists") {
        const location = url.searchParams.get("filter.location");
        const regionCode = url.searchParams.get("filter.regionCode");
        const items =
          location === "loc-1" && regionCode === "EU"
            ? [{ _id: "cl-1", title: "Cycle Count A" }]
            : location === "loc-2" && regionCode === "US"
              ? [
                  { _id: "cl-2", title: "Cycle Count B1" },
                  { _id: "cl-3", title: "Cycle Count B2" },
                ]
              : [];
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: items,
        };
      }
      if (schema === "count_lines") {
        const countList = url.searchParams.get("filter.countList");
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: countList === "cl-1" ? [{ _id: "line-1", name: "Line 1" }] : [],
        };
      }
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: [],
      };
    };

    const form: FormComponentConfig = {
      schemaName: "submissions",
      title: "Count Entry",
      fields: [
        {
          formKey: "location",
          label: "Location",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "locations",
          sourceValueField: "_id",
          sourceLabelField: "name",
        },
        {
          formKey: "countList",
          label: "Count List",
          type: "select",
          required: true,
          optionsSource: "schema",
          sourceSchemaName: "count_lists",
          sourceValueField: "_id",
          sourceLabelField: "title",
          sourceFilterBindings: [
            {
              id: "r_loc",
              field: "location",
              operator: "eq",
              value: { source: "record", fieldKey: "location", path: ["_id"] },
            },
            {
              id: "r_reg",
              field: "regionCode",
              operator: "eq",
              value: {
                source: "record",
                fieldKey: "location",
                path: ["region", "code"],
              },
            },
          ],
        },
        {
          formKey: "line",
          label: "Count Line",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "count_lines",
          sourceValueField: "_id",
          sourceLabelField: "name",
          sourceFilterBindings: [
            {
              id: "r_cl",
              field: "countList",
              operator: "eq",
              value: { source: "field", fieldKey: "countList" },
            },
          ],
        },
      ],
    };

    const client = createTestClient();
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: ["/t/acme/p/ops/counts"] },
          createElement(
            GeneralContextProvider,
            {},
            createElement(DynamicForm, { form }),
          ),
        ),
      ),
    );

    await waitFor(() =>
      expect(requests.some((req) => req.includes("schemaName=locations"))).toBe(
        true,
      ),
    );
    // Parent select must automatically project region.code for the child record binding
    expect(
      requests.find((req) => req.includes("schemaName=locations")),
    ).toContain("dataFields=region.code");
    // No unfiltered requests for dependent selects while location is empty
    expect(requests.some((req) => req.includes("schemaName=count_lists"))).toBe(
      false,
    );
    expect(requests.some((req) => req.includes("schemaName=count_lines"))).toBe(
      false,
    );

    const countListInput = screen.getByLabelText(
      "Count List",
    ) as HTMLInputElement;
    expect(countListInput.disabled).toBe(true);

    // Select Location = Main Warehouse
    await selectOption("Location", "Main Warehouse");

    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=count_lists") &&
            req.includes("filter.location=loc-1") &&
            req.includes("filter.regionCode=EU"),
        ),
      ).toBe(true),
    );

    // Wait for countList to finish loading
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Count List") as HTMLInputElement).disabled,
      ).toBe(false),
    );
    // Even though Cycle Count A is the sole option, dependent select must NOT auto-select it
    expect(screen.queryByText("Cycle Count A")).toBeNull();
    expect(requests.some((req) => req.includes("schemaName=count_lines"))).toBe(
      false,
    );

    // Explicitly select Cycle Count A
    await selectOption("Count List", "Cycle Count A");

    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=count_lines") &&
            req.includes("filter.countList=cl-1"),
        ),
      ).toBe(true),
    );

    // Change Location to Annex -> must clear both Count List and transitive Count Line
    await selectOption("Location", "Annex");

    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=count_lists") &&
            req.includes("filter.location=loc-2") &&
            req.includes("filter.regionCode=US"),
        ),
      ).toBe(true),
    );
    expect(screen.queryByText("Cycle Count A")).toBeNull();
    expect(
      (screen.getByLabelText("Count Line") as HTMLInputElement).disabled,
    ).toBe(true);
    client.clear();
  });

  it("preserves initial edit values with _id fallback, blocks unavailable non-_id record paths, isolates stale responses, and retries errors", async () => {
    window.history.replaceState(null, "", "/t/acme/p/ops/counts");
    const requests: string[] = [];
    let failCountLists = true;
    let resolveSlowLoc1: ((value: unknown) => void) | undefined;

    axiosClient.defaults.adapter = async (config) => {
      const url = new URL(config.url || "", "https://runtime.invalid");
      requests.push(`${url.pathname}?${url.searchParams.toString()}`);
      const location = url.searchParams.get("filter.location");
      if (failCountLists) {
        throw new AxiosError(
          "Server error",
          "ERR_BAD_RESPONSE",
          config,
          undefined,
          {
            config,
            status: 500,
            statusText: "Internal Server Error",
            headers: new AxiosHeaders(),
            data: { message: "Temporary failure" },
          },
        );
      }
      if (location === "loc-slow") {
        const data = await new Promise((resolve) => {
          resolveSlowLoc1 = resolve;
        });
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data,
        };
      }
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: [{ _id: `cl-${location}`, title: `List for ${location}` }],
      };
    };

    const inputs: GenericInputType[] = [
      {
        formKey: "location",
        label: "Location",
        type: InputTypes.SELECT,
        required: true,
        options: [
          {
            value: "loc-1",
            label: "Loc 1",
            sourceItem: { _id: "loc-1", name: "Loc 1" },
          },
          {
            value: "loc-slow",
            label: "Loc Slow",
            sourceItem: { _id: "loc-slow", name: "Loc Slow" },
          },
          {
            value: "loc-fast",
            label: "Loc Fast",
            sourceItem: { _id: "loc-fast", name: "Loc Fast" },
          },
        ],
      },
      {
        formKey: "countList",
        label: "Count List",
        type: InputTypes.SELECT,
        required: true,
        optionsSource: "schema",
        sourceSchemaName: "count_lists",
        sourceValueField: "_id",
        sourceLabelField: "title",
        options: [],
        sourceFilterBindings: [
          {
            id: "r_loc",
            field: "location",
            operator: "eq",
            value: { source: "record", fieldKey: "location", path: ["_id"] },
          },
        ],
      },
    ];

    const submitItem = vi.fn();
    const client = createTestClient();
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          GeneralContextProvider,
          {},
          createElement(GenericAddEditPanel, {
            isOpen: true,
            inputs,
            formKeys: [
              { key: "location", type: FormKeyTypeEnum.STRING },
              { key: "countList", type: FormKeyTypeEnum.STRING },
            ],
            isEditMode: true,
            itemToEdit: {
              id: "row-1",
              updates: { location: "loc-1", countList: "cl-loc-1" },
            },
            submitItem,
            buttonName: "Update",
          }),
        ),
      ),
    );

    // First attempt fails -> shows field error and Retry button, and blocks Update submission
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(submitItem).not.toHaveBeenCalled();

    // Retry succeeds and preserves initial edit value cl-loc-1!
    failCountLists = false;
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    await waitFor(() =>
      expect(screen.getByText("List for loc-1")).toBeTruthy(),
    );

    // Stale response check: switch to loc-slow, then immediately to loc-fast before loc-slow resolves
    await selectOption("Location", "Loc Slow");
    await selectOption("Location", "Loc Fast");

    await waitFor(() =>
      expect(
        requests.some((req) => req.includes("filter.location=loc-fast")),
      ).toBe(true),
    );
    await act(async () => {
      resolveSlowLoc1?.([{ _id: "cl-stale", title: "Stale List" }]);
    });

    fireEvent.keyDown(screen.getByLabelText("Count List"), {
      key: "ArrowDown",
    });
    expect(await screen.findByText("List for loc-fast")).toBeTruthy();
    expect(screen.queryByText("Stale List")).toBeNull();
    client.clear();
  });

  it("uses draft state in FilterPanel Apply mode without changing applied filters until Apply, and clears dependents on Clear All", async () => {
    window.history.replaceState(null, "", "/t/acme/p/ops/counts");
    const requests: string[] = [];

    axiosClient.defaults.adapter = async (config) => {
      const url = new URL(config.url || "", "https://runtime.invalid");
      requests.push(`${url.pathname}?${url.searchParams.toString()}`);
      const schema = url.searchParams.get("schemaName");
      if (schema === "locations") {
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: [{ _id: "loc-1", name: "Depot 1" }],
        };
      }
      if (schema === "count_lists") {
        const locations = url.searchParams.getAll("filter.location");
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: locations.includes("loc-1")
            ? [{ _id: "cl-1", title: "Depot 1 Count" }]
            : [],
        };
      }
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: [],
      };
    };

    const configuredInputs = [
      {
        formKey: "location",
        label: "Location",
        type: "select" as const,
        isMultiple: true,
        optionsSource: "schema" as const,
        sourceSchemaName: "locations",
        sourceValueField: "_id",
        sourceLabelField: "name",
      },
      {
        formKey: "countList",
        label: "Count List",
        type: "select" as const,
        optionsSource: "schema" as const,
        sourceSchemaName: "count_lists",
        sourceValueField: "_id",
        sourceLabelField: "title",
        sourceFilterBindings: [
          {
            id: "r_in",
            field: "location",
            operator: "in" as const,
            value: { source: "field" as const, fieldKey: "location" },
          },
        ],
      },
    ];

    const appliedHistory: Array<Record<string, unknown>> = [];

    const FilterHarness = () => {
      const [applied, setApplied] = useState<Record<string, unknown>>({
        location: [],
        countList: "",
      });
      const selectionMap = useFilterPanelSelectionData(configuredInputs);
      const panelInputs = buildConfiguredFilterInputs(
        configuredInputs,
        [],
        selectionMap,
      );
      return createElement(
        "div",
        null,
        createElement(
          "div",
          { "data-testid": "applied-state" },
          JSON.stringify(applied),
        ),
        createElement(FilterPanel, {
          inputs: panelInputs,
          formElements: applied as never,
          setFormElements: (next) => {
            const resolved =
              typeof next === "function" ? next(applied as never) : next;
            appliedHistory.push(resolved);
            setApplied(resolved);
          },
          closeFilters: () => {},
          isFilterPanelActive: true,
          isApplyButtonActive: true,
        }),
      );
    };

    const client = createTestClient();
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: ["/t/acme/p/ops/counts"] },
          createElement(
            GeneralContextProvider,
            {},
            createElement(FilterHarness),
          ),
        ),
      ),
    );

    await waitFor(() =>
      expect(requests.some((req) => req.includes("schemaName=locations"))).toBe(
        true,
      ),
    );
    // Dependent filter input must not be eagerly fetched by useFilterPanelSelectionData
    expect(requests.some((req) => req.includes("schemaName=count_lists"))).toBe(
      false,
    );

    // Choose Location in draft state
    await selectOption("Location", "Depot 1");

    // Draft change fetches dependent options with repeated filter.location=loc-1, while applied state stays untouched
    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=count_lists") &&
            req.includes("filter.location=loc-1"),
        ),
      ).toBe(true),
    );
    expect(appliedHistory).toHaveLength(0);

    // Choose Count List in draft state, then click Apply
    await selectOption("Count List", "Depot 1 Count");
    expect(appliedHistory).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(appliedHistory).toHaveLength(1);
    expect(appliedHistory[0]).toMatchObject({
      location: ["loc-1"],
      countList: "cl-1",
    });

    // Clear All Filters clears both inputs and does not send an unfiltered count_lists request
    const countBeforeClear = requests.filter((req) =>
      req.includes("schemaName=count_lists"),
    ).length;
    fireEvent.click(screen.getByRole("button", { name: "Clear All Filters" }));
    expect(
      (screen.getByLabelText("Count List") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(
      requests.filter((req) => req.includes("schemaName=count_lists")).length,
    ).toBe(countBeforeClear);
    client.clear();
  });

  it("shares identical effective requests and honors missing-reference readiness on named page requests", async () => {
    window.history.replaceState(null, "", "/t/acme/p/ops/counts");
    const selectionCalls: string[] = [];

    axiosClient.defaults.adapter = async (config) => {
      const url = new URL(config.url || "", "https://runtime.invalid");
      if (url.pathname.includes("auth/session")) {
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: { authenticated: true, user: { _id: "u-1" } },
        };
      }
      selectionCalls.push(`${url.pathname}?${url.searchParams.toString()}`);
      const schema = url.searchParams.get("schemaName");
      if (schema === "locations") {
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: [{ _id: "loc-1", name: "Hub" }],
        };
      }
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: [{ _id: "cl-1", title: "Shared Count List" }],
      };
    };

    const form: FormComponentConfig = {
      schemaName: "orders",
      fields: [
        {
          formKey: "location",
          label: "Location",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "locations",
          sourceValueField: "_id",
          sourceLabelField: "name",
        },
        {
          formKey: "primaryCountList",
          label: "Primary Count List",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "count_lists",
          sourceValueField: "_id",
          sourceLabelField: "title",
          sourceFilterBindings: [
            {
              id: "r1",
              field: "location",
              operator: "eq",
              value: { source: "field", fieldKey: "location" },
            },
          ],
        },
        {
          formKey: "secondaryCountList",
          label: "Secondary Count List",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "count_lists",
          sourceValueField: "_id",
          sourceLabelField: "title",
          sourceRequestFilters: { active: true },
          sourceFilterBindings: [
            {
              id: "r2",
              field: "location",
              operator: "eq",
              value: { source: "field", fieldKey: "location" },
            },
          ],
        },
      ],
    };

    const component: ComponentBlock = {
      id: "cmp_form",
      type: "form",
      requestBindings: {
        "options:primaryCountList": { requestId: "req_counts" },
      },
      form,
    };

    const page: PageModel = {
      id: "page_counts",
      name: "Counts",
      requests: [
        {
          id: "req_counts",
          name: "Active Count Lists",
          source: {
            transport: "selection",
            schemaName: "count_lists",
            fieldName: "title",
            valueField: "_id",
          },
          defaults: {
            filters: { active: true },
          },
          result: { kind: "records" },
        },
      ],
      sections: [{ type: "component", component }],
    };

    const client = createTestClient();
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: ["/t/acme/p/ops/counts"] },
          createElement(
            GeneralContextProvider,
            {},
            createElement(
              PageRuntimeProvider,
              { page },
              createElement(
                PageRequestConsumerProvider,
                { component },
                createElement(DynamicForm, { form, componentId: "cmp_form" }),
              ),
            ),
          ),
        ),
      ),
    );

    await waitFor(() =>
      expect(
        selectionCalls.some((call) => call.includes("schemaName=locations")),
      ).toBe(true),
    );
    // Even though primaryCountList is connected to a named page request, it must NOT fire while location is empty!
    expect(
      selectionCalls.some((call) => call.includes("schemaName=count_lists")),
    ).toBe(false);

    // Select Location = Hub -> both primaryCountList (named request with active=true + local location=loc-1)
    // and secondaryCountList (inline source with active=true + location=loc-1) have identical effective requests and share 1 fetch!
    await selectOption("Location", "Hub");

    await waitFor(() =>
      expect(
        selectionCalls.filter((call) =>
          call.includes("schemaName=count_lists"),
        ),
      ).toHaveLength(1),
    );
    expect(
      selectionCalls.find((call) => call.includes("schemaName=count_lists")),
    ).toContain("filter.active=true");
    expect(
      selectionCalls.find((call) => call.includes("schemaName=count_lists")),
    ).toContain("filter.location=loc-1");
    client.clear();
  });

  it("resolves {{product.item._id}}=item._id in sourceRequestFilters, projects item._id, and clears item when product changes", async () => {
    window.history.replaceState(null, "", "/t/acme/p/catalog/orders");
    const requests: string[] = [];

    axiosClient.defaults.adapter = async (config) => {
      const url = new URL(config.url || "", "https://runtime.invalid");
      requests.push(`${url.pathname}?${url.searchParams.toString()}`);
      const schema = url.searchParams.get("schemaName");
      if (schema === "products") {
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data: [
            { _id: "prod-1", name: "Burger Meal", item: { _id: "item-42" } },
            { _id: "prod-2", name: "Soda Can", item: "item-99" },
          ],
        };
      }
      if (schema === "items") {
        const idFilter = url.searchParams.get("filter._id");
        return {
          config,
          status: 200,
          statusText: "OK",
          headers: new AxiosHeaders(),
          data:
            idFilter === "item-42"
              ? [{ _id: "item-42", name: "Beef Patty" }]
              : idFilter === "item-99"
                ? [{ _id: "item-99", name: "Cola" }]
                : [],
        };
      }
      return {
        config,
        status: 200,
        statusText: "OK",
        headers: new AxiosHeaders(),
        data: [],
      };
    };

    const form: FormComponentConfig = {
      schemaName: "orders",
      title: "Product Item Order",
      fields: [
        {
          formKey: "product",
          label: "Product",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "products",
          sourceValueField: "_id",
          sourceLabelField: "name",
        },
        {
          formKey: "item",
          label: "Item",
          type: "select",
          optionsSource: "schema",
          sourceSchemaName: "items",
          sourceValueField: "_id",
          sourceLabelField: "name",
          sourceRequestFilters: parseRequestFiltersInput("{{product.item._id}}=item._id", {
            formKey: "item",
            sourceSchemaName: "items",
          }),
        },
      ],
    };

    const client = createTestClient();
    render(
      createElement(
        QueryClientProvider,
        { client },
        createElement(
          MemoryRouter,
          { initialEntries: ["/t/acme/p/catalog/orders"] },
          createElement(GeneralContextProvider, {}, createElement(DynamicForm, { form })),
        ),
      ),
    );

    await waitFor(() =>
      expect(requests.some((req) => req.includes("schemaName=products"))).toBe(true),
    );
    expect(requests.find((req) => req.includes("schemaName=products"))).toContain(
      "dataFields=item._id",
    );
    expect(requests.some((req) => req.includes("schemaName=items"))).toBe(false);
    expect((screen.getByLabelText("Item") as HTMLInputElement).disabled).toBe(true);

    // Select Product = Burger Meal (populated item: { _id: "item-42" })
    await selectOption("Product", "Burger Meal");

    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=items") && req.includes("filter._id=item-42"),
        ),
      ).toBe(true),
    );
    await waitFor(() =>
      expect((screen.getByLabelText("Item") as HTMLInputElement).disabled).toBe(false),
    );
    await selectOption("Item", "Beef Patty");

    // Switch Product = Soda Can (scalar foreign key item: "item-99") -> clears Beef Patty and fetches filter._id=item-99
    await selectOption("Product", "Soda Can");
    await waitFor(() =>
      expect(
        requests.some(
          (req) =>
            req.includes("schemaName=items") && req.includes("filter._id=item-99"),
        ),
      ).toBe(true),
    );
    expect(screen.queryByText("Beef Patty")).toBeNull();
    client.clear();
  });
});

import { format } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Header } from "../components/header/Header";
import GenericTable from "../components/panelComponents/Tables/GenericTable";
import SwitchButton from "../components/panelComponents/common/SwitchButton";
import { InputTypes } from "../components/panelComponents/shared/types";
import { useGeneralContext } from "../context/General.context";
import { FormElementsState } from "../types";
import { AuditLog, useGetPaginatedAuditLogs } from "../utils/api/auditLogs";
import { useGetContainers } from "../utils/api/container";

const AUDIT_LOGS_ROWS_PER_PAGE_OPTIONS: number[] = [10, 20, 50, 100, 200, 500];

// Action types for audit logs (matching backend)
const auditActionTypes = [
  { value: "create", label: "CREATE", bgColor: "bg-emerald-600" },
  { value: "update", label: "UPDATE", bgColor: "bg-sky-600" },
  { value: "delete", label: "DELETE", bgColor: "bg-rose-600" },
  { value: "bulk_create", label: "BULK CREATE", bgColor: "bg-emerald-500" },
  { value: "bulk_update", label: "BULK UPDATE", bgColor: "bg-sky-500" },
  { value: "bulk_delete", label: "BULK DELETE", bgColor: "bg-rose-500" },
  { value: "login", label: "LOGIN", bgColor: "bg-violet-600" },
  { value: "logout", label: "LOGOUT", bgColor: "bg-amber-600" },
];

type CollapsibleRow = {
  collapsibleColumns: { key: string; isSortable: boolean }[];
  collapsibleRows: {
    before?: unknown;
    after?: unknown;
  }[];
  collapsibleRowKeys: {
    key: string;
    node: (row: { before?: unknown; after?: unknown }) => React.ReactNode;
  }[];
};

type AuditLogRow = AuditLog & {
  formattedDate: string;
  createHour: string;
  collapsible: CollapsibleRow;
};

const initialFilterState: FormElementsState = {
  date: "",
  action: "",
  userEmail: "",
  schemaName: "",
  sort: "timestamp",
  asc: 1,
  search: "",
};

const AuditLogs = () => {
  const { t } = useTranslation();
  const { rowsPerPage } = useGeneralContext();
  const rawContainers = useGetContainers();
  const [currentPage, setCurrentPage] = useState(1);

  // Filter state
  const [showFilters, setShowFilters] = useState(() => {
    const stored = localStorage.getItem("showAuditFilters");
    return stored === "true";
  });

  const [filterFormElements, setFilterFormElements] =
    useState<FormElementsState>(initialFilterState);

  useEffect(() => {
    localStorage.setItem("showAuditFilters", String(showFilters));
  }, [showFilters]);

  const auditLogsPayload = useGetPaginatedAuditLogs(
    currentPage,
    rowsPerPage,
    filterFormElements,
  );

  const schemaOptions = useMemo(() => {
    if (!rawContainers) return [];
    return rawContainers.map((container) => ({
      value: container.schemaName,
      label: container.schemaName,
    }));
  }, [rawContainers]);

  const rows = useMemo(() => {
    if (!auditLogsPayload?.items) return [];
    return auditLogsPayload.items.map((log: AuditLog) => {
      const timestamp = log.timestamp ? new Date(log.timestamp) : null;

      return {
        ...log,
        formattedDate: timestamp ? format(timestamp, "yyyy-MM-dd") : "",
        createHour: timestamp ? format(timestamp, "HH:mm:ss") : "",
        collapsible: {
          collapsibleColumns: [
            { key: t("Before"), isSortable: false },
            { key: t("After"), isSortable: false },
          ],
          collapsibleRows:
            log.before || log.after
              ? [
                  {
                    before: log.before,
                    after: log.after,
                  },
                ]
              : [],
          collapsibleRowKeys: [
            {
              key: "before",
              node: (row: { before?: unknown; after?: unknown }) => {
                return row?.before ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                    {JSON.stringify(row.before, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-400">-</span>
                );
              },
            },
            {
              key: "after",
              node: (row: { before?: unknown; after?: unknown }) => {
                return row?.after ? (
                  <pre className="text-xs bg-gray-50 p-2 rounded max-h-40 overflow-auto">
                    {JSON.stringify(row.after, null, 2)}
                  </pre>
                ) : (
                  <span className="text-gray-400">-</span>
                );
              },
            },
          ],
        },
      };
    });
  }, [auditLogsPayload, t]);

  const columns = useMemo(
    () => [
      {
        key: t("User Email"),
        isSortable: true,
        correspondingKey: "userEmail",
      },
      {
        key: t("Action"),
        isSortable: true,
        correspondingKey: "action",
      },
      {
        key: t("Schema"),
        isSortable: true,
        correspondingKey: "schemaName",
      },
      {
        key: t("Date"),
        isSortable: true,
        correspondingKey: "timestamp",
      },
      {
        key: t("Time"),
        isSortable: true,
        correspondingKey: "time",
      },
      {
        key: t("IP Address"),
        isSortable: false,
      },
    ],
    [t],
  );

  const rowKeys = useMemo(
    () => [
      {
        key: "userEmail",
        className: "font-medium text-gray-700",
      },
      {
        key: "action",
        node: (row: AuditLogRow) => {
          const foundAction = auditActionTypes.find(
            (action) => action.value === row.action,
          );
          if (!foundAction) {
            return (
              <span className="bg-gray-600 w-fit px-3 py-1.5 rounded-lg text-white text-sm font-semibold uppercase mr-auto">
                {row.action}
              </span>
            );
          }
          return (
            <span
              className={`${foundAction.bgColor} w-fit px-3 py-1.5 rounded-lg text-white text-sm font-semibold mr-auto`}
            >
              {foundAction.label}
            </span>
          );
        },
      },
      {
        key: "schemaName",
        className: "text-gray-600",
      },
      {
        key: "formattedDate",
        className: "min-w-32",
      },
      {
        key: "createHour",
        className: "font-mono text-gray-600",
      },
      {
        key: "ip",
        className: "font-mono text-sm text-gray-500",
      },
    ],
    [],
  );

  const filterPanelInputs = useMemo(
    () => [
      {
        type: InputTypes.DATE,
        formKey: "date",
        label: t("Date"),
        placeholder: t("Date"),
        required: false,
        isDatePicker: true,
        isOnClearActive: true,
      },
      {
        type: InputTypes.TEXT,
        formKey: "userEmail",
        label: t("User Email"),
        placeholder: t("User Email"),
        required: false,
      },
      {
        type: InputTypes.SELECT,
        formKey: "action",
        label: t("Action"),
        options: auditActionTypes.map((action) => ({
          value: action.value,
          label: action.label,
        })),
        placeholder: t("Action"),
        required: false,
      },
      {
        type: InputTypes.SELECT,
        formKey: "schemaName",
        label: t("Schema Name"),
        options: schemaOptions,
        placeholder: t("Schema Name"),
        required: false,
      },
    ],
    [t, schemaOptions],
  );

  const filters = useMemo(
    () => [
      {
        label: t("Show Filters"),
        isUpperSide: true,
        node: (
          <SwitchButton
            checked={showFilters}
            onChange={() => {
              setShowFilters(!showFilters);
            }}
          />
        ),
      },
    ],
    [t, showFilters, setShowFilters],
  );

  const filterPanel = useMemo(
    () => ({
      isFilterPanelActive: showFilters,
      inputs: filterPanelInputs,
      formElements: filterFormElements,
      setFormElements: setFilterFormElements,
      additionalFilterCleanFunction: () => {
        setFilterFormElements(initialFilterState);
      },
      closeFilters: () => setShowFilters(false),
    }),
    [showFilters, filterPanelInputs, filterFormElements],
  );

  const pagination = useMemo(() => {
    return auditLogsPayload
      ? {
          totalPages: auditLogsPayload.totalPages,
          totalRows: auditLogsPayload.totalItems,
        }
      : undefined;
  }, [auditLogsPayload]);

  const outsideSearchProps = useMemo(() => {
    return {
      t,
      filterPanelFormElements: filterFormElements,
      setFilterPanelFormElements: setFilterFormElements,
    };
  }, [t, filterFormElements]);

  const outsideSort = useMemo(
    () => ({
      filterPanelFormElements: filterFormElements,
      setFilterPanelFormElements: setFilterFormElements,
    }),
    [filterFormElements],
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [filterFormElements, setCurrentPage]);

  return (
    <>
      <Header />
      <div className="w-[95%] mx-auto my-10">
        <GenericTable
          rowKeys={rowKeys}
          columns={columns}
          rowsPerPageOptions={AUDIT_LOGS_ROWS_PER_PAGE_OPTIONS}
          rows={rows ?? []}
          filterPanel={filterPanel}
          outsideSearchProps={outsideSearchProps}
          filters={filters}
          isSearch={false}
          title={t("Audit Logs")}
          isActionsActive={false}
          isCollapsible={true}
          outsideSortProps={outsideSort}
          {...(pagination && { pagination })}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </>
  );
};

export default AuditLogs;

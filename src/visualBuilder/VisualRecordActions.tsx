import { pageRequestInvalidationPredicate } from "../pageRuntime/requests/invalidation";
import { usePageRequestConsumer } from "../pageRuntime/requests/ConsumerProvider";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { shouldInvalidateVisualCollectionQuery } from "../utils/dynamicQueryKeys";
import { useTenantProject } from "../hooks/useTenantProject";
import { useUserContext } from "../context/User.context";
import { useDynamicCrud } from "../utils/dynamic";
import { getApiErrorMessage } from "../utils/api/errorMessage";
import { getTableActionRowState } from "../utils/tableActions";
import { resolveTableActionFormLayout } from "../utils/tableActionFormLayout";
import { prepareFormEditValues } from "../utils/formEditValues";
import { buildFormInputs, buildFormKeys } from "../utils/formConfig";
import { useFormSelectionData } from "../components/forms/useFormSelectionData";
import GenericAddEditPanel from "../components/panelComponents/FormElements/GenericAddEditPanel";
import { ConfirmationDialog } from "../common/ConfirmationDialog";
import { normalizeLinkUrl } from "../visual-engine/model/urls";
import { resolveFieldBinding } from "../visual-engine/renderer/bindings";
import type { VisualHostActionEvent } from "../visual-engine/renderer/VisualRenderer";
import { readRecordAction, prepareRecordAction, buildRecordActionPayload, itemPath, type RecordActionConfig, type PreparedRecordAction } from "./recordActions";

type RecordValue = Record<string, unknown> & { _id: string | number };
interface Pending { key: string; scope: string; config: RecordActionConfig; prepared: PreparedRecordAction }
export interface VisualActionHost {
 onHostAction(event: VisualHostActionEvent): void;
 getHostActionState(event: VisualHostActionEvent): { hidden?: boolean; disabled?: boolean; reason?: string };
}
export default function VisualRecordActions({ children }: { children: (host: VisualActionHost) => ReactNode }) {
 const { tenant, project } = useTenantProject();
 const requestScope = usePageRequestConsumer()?.scope;
 const queryClient = useQueryClient();
 const { user } = useUserContext();
 const actor = user as unknown as { _id?: string; id?: string } | undefined;
 const scope = `${tenant}/${project}/${actor?._id || actor?.id || "anonymous"}`;
 const activeScope = useRef(scope); activeScope.current = scope;
 const [pending, setPending] = useState<Pending | null>(null), [error, setError] = useState("");
 const current = useRef(pending); current.current = pending;
 useEffect(() => { setPending(null); setError(""); }, [scope]);
 const getHostActionState: VisualActionHost["getHostActionState"] = event => {
  try {
   const config = readRecordAction(event.action);
   const state = getTableActionRowState(config.action, { ...event.item, _id: String(event.item?._id ?? "") });
   if (config.action.enabled === false) return { hidden: true };
   if (!state.hidden && !state.disabled) prepareRecordAction(config, event.item);
   return state;
  } catch (reason) { return { disabled: true, reason: (reason as Error).message }; }
 };
 const onHostAction = (event: VisualHostActionEvent) => {
  if (current.current?.scope === scope) return;
  try {
   const state = getHostActionState(event);
   if (state.hidden || state.disabled) throw new Error(state.reason || "This action is unavailable for this record.");
   const config = readRecordAction(event.action), prepared = prepareRecordAction(config, event.item);
   if (config.action.kind === "link") {
    const raw = config.action.linkTemplate || config.action.path || "";
    const target = raw.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_token, path: string) => {
     const value = resolveFieldBinding(event.item, itemPath(path));
     if (!["string", "number", "boolean"].includes(typeof value)) throw new Error(`Missing link value: ${path}`);
     return String(value);
    });
    const result = normalizeLinkUrl(target);
    if (!target || !result.success) throw new Error("The configured link is not valid.");
    window.location.assign(result.value); return;
   }
   const next = { key: crypto.randomUUID(), scope, config, prepared };
   current.current = next; setPending(next); setError("");
  } catch (reason) { setError((reason as Error).message); }
 };
 return <>{children({ onHostAction, getHostActionState })}{error && <p role="alert">{error}</p>}{pending?.scope === scope && <RecordActionModal key={pending.key} pending={pending} refreshData={async () => {
   // Table mutations update their own cache optimistically. Visual collections have
   // separate keys and must also refresh after our write, even without a socket event.
   // Cancel an older read so its pre-write snapshot cannot satisfy this refresh.
   if (activeScope.current !== pending.scope) return;
   const schemas = new Set([pending.config.schemaName, pending.config.action.submit?.workflowSchema].filter((name): name is string => !!name));
   await queryClient.invalidateQueries({
    predicate: query => [...schemas].some(schema =>
     (query.queryKey[0] === "dynamic" && query.queryKey[1] === schema)
     || shouldInvalidateVisualCollectionQuery(query, schema, tenant && project ? { tenant, project } : null)
     || pageRequestInvalidationPredicate(requestScope, schema)(query)),
    refetchType: "active",
   });
  }} close={() => { setPending(value => value?.key === pending.key ? null : value); if (current.current?.key === pending.key) current.current = null; }} />}</>;
}

function RecordActionModal({ pending, close, refreshData }: { pending: Pending; close: () => void; refreshData: () => Promise<void> }) {
 const { config, prepared } = pending;
 const action = config.action;
 const form = { schemaName: config.schemaName, fields: action.formFields || [] };
 const selections = useFormSelectionData(form);
 const inputs = buildFormInputs(form, selections), keys = buildFormKeys(form);
 const initialValues = useMemo(() => {
  const fields = action.formFields || [];
  return prepareFormEditValues(prepared.initialValues, buildFormKeys({ schemaName: config.schemaName, fields }), fields);
 }, [prepared.initialValues, action.formFields, config.schemaName]);
 const crud = useDynamicCrud<RecordValue>(config.schemaName, form.fields.some(field => field.type === "image"), undefined, false);
 const [error, setError] = useState("");
 const busy = useRef(false);
 const [saving, setSaving] = useState(false);
 const submit = async (values: Record<string, unknown>) => {
  if (busy.current) return;
  busy.current = true; setSaving(true); setError("");
  try {
   const payload = buildRecordActionPayload(config, prepared, values);
   if (action.submit?.workflowName) {
    const record = { ...(action.kind === "create" ? {} : prepared.item), ...payload, ...(prepared.id === undefined ? {} : { _id: prepared.id }) };
    await crud.executeWorkflowMutation.mutateAsync({ workflowName: action.submit.workflowName, workflowSchema: action.submit.workflowSchema, record, oldRecord: prepared.item });
   } else if (action.kind === "create") await crud.createMutation.mutateAsync(payload);
   else if (action.kind === "delete") await crud.deleteMutation.mutateAsync(prepared.id!);
   else await crud.updateMutation.mutateAsync({ id: prepared.id!, updates: payload });
   await refreshData();
   close();
  } catch (reason) { const message = getApiErrorMessage(reason); setError(message); throw reason; }
  finally { busy.current = false; setSaving(false); }
 };
 const run = useRef(submit); run.current = submit;
 useEffect(() => { if (action.modalType === "none") void run.current(prepared.initialValues).catch(() => {}); }, [action.modalType, prepared.initialValues]);
 const dismiss = () => { if (!busy.current) close(); };
 if (action.modalType === "form") return <GenericAddEditPanel<RecordValue>
  isOpen close={dismiss} inputs={inputs} formKeys={keys} constantValues={initialValues}
  submitItem={item => submit(item as Record<string, unknown>)}
  buttonName={action.buttonName || action.label || (action.kind === "create" ? "Create" : "Save changes")}
  isCreateCloseActive={false} isSubmitButtonActive={!saving}
  anotherPanel={error ? <p role="alert">{error}</p> : saving ? <p role="status">Saving…</p> : undefined}
  {...resolveTableActionFormLayout(action, { topClassName: "flex flex-col gap-2" })}
 />;
 if (action.modalType === "confirm") return <ConfirmationDialog isOpen close={dismiss} confirm={() => { void submit(prepared.initialValues).catch(() => {}); }} title={action.confirmTitle || action.label || "Confirm action"} text={error || action.confirmText || "Continue with this action?"} />;
 return <>{saving && <p role="status">Saving…</p>}{error && <div role="alert">{error}<button type="button" onClick={() => { void submit(prepared.initialValues).catch(() => {}); }}>Try again</button><button type="button" onClick={dismiss}>Dismiss</button></div>}</>;
}

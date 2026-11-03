import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { PageModel } from "../types/page";
import type { ComponentDocument } from "../visual-engine/model";
import { DEFAULT_SITE_THEME, type SiteTheme } from "../visual-engine/theme";
import { VisualBuilder } from "../visual-engine/editor/VisualBuilder";
import { listVisualBlocks, readVisualBlock, sameValue } from "./pageAdapter";
import { managementErrorMessage } from "./managementClient";
import { createPageRepository } from "./pageRepository";
import { panelURL, validateEditorTarget } from "./routes";
import { useUnsavedChanges } from "./useUnsavedChanges";
import type { VisualBlockValue, VisualTarget } from "./types";
import "../visual-engine/host/utilities.css";
import "./visual-builder-host.css";

interface EditingSession { key: string; pageId: string; target: VisualTarget; initial: VisualBlockValue }
const pageID = (page: PageModel) => page.id || page._id || "";

export default function VisualBuilderPage() {
  const { tenant = "", project = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const client = useQueryClient();
  const repository = useMemo(() => createPageRepository({ tenant, project }), [tenant, project]);
  const pagesKey = useMemo(() => ["visual-builder", "pages", tenant, project], [tenant, project]);
  const pagesQuery = useQuery({ queryKey: pagesKey, queryFn: repository.list, retry: false, staleTime: 0 });
  const pages = pagesQuery.data ?? [];
  const selectedPageId = params.get("page") ?? pageID(pages.find(page => !page.isGroupOnly) ?? { name: "", sections: [] });
  const detailKey = useMemo(() => ["visual-builder", "page", tenant, project, selectedPageId], [tenant, project, selectedPageId]);
  let targetError = "";
  if ((pagesQuery.data !== undefined) && selectedPageId) { try { validateEditorTarget(pages, selectedPageId); } catch (error) { targetError = managementErrorMessage(error); } }
  const pageQuery = useQuery({ queryKey: detailKey, queryFn: () => repository.load(selectedPageId), enabled: !!selectedPageId && (pagesQuery.data !== undefined) && !targetError, retry: false, staleTime: 0 });
  const [session, setSession] = useState<EditingSession | null>(null);
  const sessionRef = useRef(session); sessionRef.current = session;
  const documentRef = useRef<ComponentDocument | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [reloading, setReloading] = useState(false);
  const reloadRef = useRef(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const confirmDiscard = useUnsavedChanges(dirty || !!session?.target.isNew, saving || reloading);
  const blocks = pageQuery.data ? listVisualBlocks(pageQuery.data) : [];
  const selectedComponentId = params.get("component") ?? (session?.pageId === selectedPageId && session.key.startsWith(`${tenant}/${project}/`) ? session.target.componentId : blocks[0]?.id) ?? "";

  useEffect(() => {
    if (!pageQuery.data || targetError || reloadRef.current) return;
    const key = `${tenant}/${project}/${selectedPageId}/${selectedComponentId}/${revision}`;
    if (sessionRef.current?.key === key) return;
    setError(""); setMessage(""); setDirty(false);
    if (!selectedComponentId) { setSession(null); documentRef.current = null; return; }
    const matches = listVisualBlocks(pageQuery.data).filter(block => block.id === selectedComponentId);
    if (matches.length !== 1) { setSession(null); setError("The selected visual block is missing or has duplicate IDs. Reload or choose another block."); return; }
    try {
      const initial = readVisualBlock(matches[0]);
      documentRef.current = initial.document;
      setSession({ key, pageId: selectedPageId, target: { componentId: selectedComponentId, baseline: structuredClone(matches[0]), isNew: false }, initial });
    } catch (reason) { setSession(null); setError(managementErrorMessage(reason)); }
  }, [pageQuery.data, selectedComponentId, selectedPageId, tenant, project, targetError, revision, params, reloading]);

  const select = (pageId: string, componentId?: string) => {
    if (!confirmDiscard()) return;
    setSession(null); setDirty(false); setError(""); setMessage("");
    setParams({ page: pageId, ...(componentId ? { component: componentId } : {}) });
  };
  const addSection = () => {
    if (!pageQuery.data || !confirmDiscard()) return;
    const componentId = crypto.randomUUID();
    const document: ComponentDocument = { version: 2, id: crypto.randomUUID(), name: `${pageQuery.data.name} visual section`, kind: "section", root: { id: crypto.randomUUID(), type: "section", style: { spacing: { paddingX: "lg", paddingY: "lg" }, color: { background: "surface", text: "text" } }, children: [] } };
    documentRef.current = document;
    setParams({ page: selectedPageId });
    setSession({ key: `${tenant}/${project}/${selectedPageId}/${componentId}/${revision}`, pageId: selectedPageId, target: { componentId, isNew: true }, initial: { document, theme: structuredClone(DEFAULT_SITE_THEME) } });
    setDirty(true); setError(""); setMessage("");
  };
  const persist = async (document: ComponentDocument, theme?: SiteTheme) => {
    const editing = sessionRef.current;
    if (!editing || savingRef.current) throw new Error("A save is already in progress. Wait for it to finish.");
    savingRef.current = true; setSaving(true); setError(""); setMessage("");
    try {
      const value = { document, ...(theme ? { theme } : editing.initial.theme ? { theme: editing.initial.theme } : {}) };
      const saved = await repository.save({ pageId: editing.pageId, target: editing.target, value });
      const block = listVisualBlocks(saved).find(block => block.id === editing.target.componentId)!;
      const canonical = readVisualBlock(block);
      if (sessionRef.current?.key === editing.key) {
        setSession(current => current?.key === editing.key ? { ...current, target: { ...current.target, baseline: structuredClone(block), isNew: false }, initial: canonical } : current);
        setMessage("Visual section saved to this project page.");
      }
      client.setQueryData(detailKey, saved);
      client.setQueryData<PageModel[]>(pagesKey, previous => previous?.map(page => pageID(page) === editing.pageId ? saved : page));
      void client.invalidateQueries({ queryKey: ["page"] });
      // The editor owns dirty status; a theme save may include newer document edits.
      if (sameValue(documentRef.current, document)) documentRef.current = document;
    } catch (reason) {
      const message = managementErrorMessage(reason); setError(message); throw new Error(message);
    } finally { savingRef.current = false; setSaving(false); }
  };
  const onDocumentChange = useCallback((document: ComponentDocument) => { documentRef.current = document; }, []);
  const saveDocument = (document: ComponentDocument) => persist(document);
  const saveTheme = (theme: SiteTheme) => {
    if (!documentRef.current) return Promise.reject(new Error("No visual document is selected."));
    return persist(documentRef.current, theme);
  };
  const reload = async () => {
    if (reloadRef.current || !confirmDiscard()) return;
    reloadRef.current = true; setReloading(true); setError(""); setMessage("");
    try {
      const list = await pagesQuery.refetch();
      if (list.error) throw list.error;
      if (selectedPageId) {
        const detail = await pageQuery.refetch();
        if (detail.error) throw detail.error;
      }
      // Remount only after fresh data has replaced the cache. Retain the
      // active block selection, and keep the draft if either read fails.
      setDirty(false); setRevision(value => value + 1);
    } catch (reason) { setError(managementErrorMessage(reason)); }
    finally { reloadRef.current = false; setReloading(false); }
  };
  const panel = panelURL(import.meta.env.VITE_TENANT_PANEL_URL);
  const problem = pagesQuery.error || pageQuery.error;
  const ready = (pagesQuery.data !== undefined) && (pageQuery.data !== undefined) && !targetError;
  const activeSession = session && session.pageId === selectedPageId && session.key.startsWith(`${tenant}/${project}/`) && session.target.componentId === selectedComponentId;
  const renderedPage = pageQuery.data;
  const pagePath = renderedPage ? `/t/${encodeURIComponent(tenant)}/p/${encodeURIComponent(project)}/${renderedPage.slug || renderedPage.name.toLowerCase().replace(/\s+/g, "-")}` : "";

  return <div className={`vb-host${session ? " vb-host--active" : ""}`}>
    <header className="vb-host__bar">
      <div className="vb-host__identity"><strong>Visual builder</strong><span>{tenant} / {project}</span></div>
      {(pagesQuery.data !== undefined) && pages.length > 0 ? <>
        <label>Page<select aria-label="Builder page" value={selectedPageId} disabled={saving || reloading} onChange={event => select(event.target.value)}>
          {pages.filter(page => !page.isGroupOnly).map(page => <option key={pageID(page)} value={pageID(page)}>{page.name}</option>)}
        </select></label>
        {blocks.length > 0 ? <label>Visual section<select aria-label="Builder visual section" value={session?.target.isNew ? "__new" : selectedComponentId} disabled={saving || reloading} onChange={event => select(selectedPageId, event.target.value)}>
          {session?.target.isNew ? <option value="__new">New unsaved section</option> : null}
          {blocks.map((block, index) => <option key={`${block.id}-${index}`} value={block.id}>{block.title || `Visual section ${index + 1}`}</option>)}
        </select></label> : null}
        <button type="button" disabled={!ready || saving || reloading} onClick={addSection}>Add visual section</button>
      </> : null}
      <button type="button" disabled={saving || reloading || pagesQuery.isFetching || pageQuery.isFetching} onClick={() => void reload()}>Reload</button>
      {pagePath && !session?.target.isNew ? <a href={pagePath} target="_blank" rel="noopener noreferrer">View page ↗</a> : null}
      {panel ? <a href={panel} target="_blank" rel="noopener noreferrer">Tenant Panel ↗</a> : null}
      <span role="status" className="vb-host__state">{reloading ? "Reloading…" : saving ? "Saving…" : dirty || session?.target.isNew ? "Unsaved changes" : message || ""}</span>
    </header>
    {problem || targetError || error ? <div className="vb-host__notice" role="alert">{problem ? managementErrorMessage(problem) : targetError || error}</div> : null}
    {pagesQuery.isPending || (selectedPageId && pageQuery.isPending && !targetError) ? <p className="vb-host__empty" role="status">Loading project pages…</p> : null}
    {(pagesQuery.data !== undefined) && !pages.some(page => !page.isGroupOnly) ? <div className="vb-host__empty"><h1>Create a page to start designing</h1><p>Create a content page in Tenant Panel, then reload this builder.</p></div> : null}
    {ready && !session && !error ? <div className="vb-host__empty"><h1>Design a visual section</h1><p>Add a section to this page, then use the component library, canvas and inspector to design it.</p><button type="button" onClick={addSection}>Add visual section</button></div> : null}
    {activeSession && session ? <div className="ve-utilities vb-host__editor" inert={reloading ? "" : undefined} aria-busy={reloading}><VisualBuilder key={session.key} initialDocument={session.initial.document} initialTheme={session.initial.theme ?? DEFAULT_SITE_THEME} storageMode="external" storageNamespace={`${tenant}/${project}`} versionNamespace={`${tenant}/${project}/${session.pageId}/${session.target.componentId}`} onDirtyChange={setDirty} onDocumentChange={onDocumentChange} onSaveDocument={saveDocument} onSaveTheme={saveTheme} /></div> : null}
    <footer className="vb-host__local-note">Templates, style kits and versions are local to this browser and project. Live API collection binding will be added in the next phase.</footer>
  </div>;
}

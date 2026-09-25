import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import { axiosClient } from "../utils/api/axiosClient";
import {
  applySeoDraft,
  createSeoDraft,
  type SeoDraft,
  type SeoPageRecord,
  unwrapRecords,
} from "../features/seo/seoModel";

interface SiteConfigRecord {
  _id?: string;
  sourceLocale: string;
  defaultLocale: string;
  enabledLocales: string[];
  seo?: GlobalSeoDraft;
}

interface GlobalSeoDraft {
  siteName?: string;
  titleTemplate?: string;
  defaultDescription?: string;
  defaultImage?: string;
  primaryDomain?: string;
  additionalDomains?: string[];
}

type UpdateState = "idle" | "saving" | "saved" | "pending" | "failed";

const emptyDraft: SeoDraft = {
  slug: "",
  title: "",
  description: "",
  keywords: "",
  socialImage: "",
  noIndex: false,
  excludeFromSitemap: false,
};

async function loadRecords<T>(schemaName: string) {
  const response = await axiosClient.get(`/dynamic?schemaName=${encodeURIComponent(schemaName)}`);
  return unwrapRecords<T>(response.data);
}

export default function SeoControlPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [locale, setLocale] = useState("");
  const [draft, setDraft] = useState<SeoDraft>(emptyDraft);
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [search, setSearch] = useState("");
  const [globalSeo, setGlobalSeo] = useState<GlobalSeoDraft>({});

  const configQuery = useQuery({ queryKey: ["seo", "siteConfig"], queryFn: () => loadRecords<SiteConfigRecord>("siteConfig") });
  const pagesQuery = useQuery({ queryKey: ["seo", "sitePages"], queryFn: () => loadRecords<SeoPageRecord>("sitePages") });
  const config = configQuery.data?.[0];
  const pages = useMemo(() => [...(pagesQuery.data || [])].sort((a, b) => a.slug.localeCompare(b.slug)), [pagesQuery.data]);
  const selected = pages.find((page) => page.id === selectedId) || pages[0];
  const activeLocale = locale || config?.defaultLocale || config?.sourceLocale || "en";

  useEffect(() => { if (!selectedId && pages[0]) setSelectedId(pages[0].id); }, [pages, selectedId]);
  useEffect(() => { if (!locale && config) setLocale(config.defaultLocale); }, [config, locale]);
  useEffect(() => { if (config) setGlobalSeo(config.seo || {}); }, [config]);
  useEffect(() => {
    if (selected && config) {
      setDraft(createSeoDraft(selected, activeLocale, config.sourceLocale, config.defaultLocale));
      setUpdateState("idle");
    }
  }, [selected, activeLocale, config]);

  const save = useMutation({
    mutationFn: async () => {
      if (!selected || !config) throw new Error("Select a page before saving");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug) && draft.slug !== "home") throw new Error("Slug must use lowercase letters, numbers, and hyphens");
      if (!draft.title.trim()) throw new Error("SEO title is required");
      const id = selected._id || selected.id;
      const patch = applySeoDraft(selected, activeLocale, draft, new Date().toISOString(), config.defaultLocale);
      setUpdateState("saving");
      const response = await axiosClient.patch(`/dynamic/${encodeURIComponent(id)}?schemaName=sitePages`, patch);
      return (response.data?.data || response.data) as SeoPageRecord;
    },
    onSuccess: () => {
      setUpdateState("pending");
      queryClient.invalidateQueries({ queryKey: ["seo", "sitePages"] });
      toast.success("SEO saved. Public rendering will use it on the next request.");
    },
    onError: (error: Error) => {
      setUpdateState("failed");
      toast.error(error.message || "SEO could not be saved");
    },
  });
  const saveGlobal = useMutation({
    mutationFn: async () => {
      if (!config) throw new Error("Site configuration is unavailable");
      const id = config._id;
      if (!id) throw new Error("The siteConfig record must expose its AutoTable _id");
      const response = await axiosClient.patch(`/dynamic/${encodeURIComponent(id)}?schemaName=siteConfig`, { seo: globalSeo });
      return response.data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["seo", "siteConfig"] }); toast.success("Global SEO defaults saved"); },
    onError: (error: Error) => toast.error(error.message || "Global SEO defaults could not be saved"),
  });

  const filteredPages = pages.filter((page) => page.slug.toLowerCase().includes(search.toLowerCase()));
  const publicOrigin = (import.meta.env.VITE_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const publicPath = selected?.slug === "home" ? (activeLocale === config?.defaultLocale ? "" : `/${activeLocale}`) : `${activeLocale === config?.defaultLocale ? "" : `/${activeLocale}`}/${draft.slug}`;

  if (configQuery.isLoading || pagesQuery.isLoading) return <div className="p-8 text-neutral-500">Loading SEO workspace…</div>;
  if (configQuery.isError || pagesQuery.isError || !config) return <div className="p-8"><h1 className="text-2xl font-semibold">SEO workspace unavailable</h1><p className="mt-2 text-neutral-600">The existing siteConfig and sitePages AutoTable containers could not be read.</p></div>;

  return (
    <main className="min-h-screen bg-neutral-50 p-5 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div><p className="text-sm font-medium text-indigo-600">Search visibility</p><h1 className="text-3xl font-semibold tracking-tight text-neutral-950">SEO control</h1><p className="mt-1 text-sm text-neutral-600">Edit public metadata stored in your existing AutoTable site records.</p></div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${updateState === "failed" ? "bg-red-100 text-red-700" : updateState === "pending" ? "bg-amber-100 text-amber-800" : "bg-neutral-200 text-neutral-700"}`}>
              {updateState === "saving" ? "Saving…" : updateState === "pending" ? "Saved · public confirmation pending" : updateState === "failed" ? "Save failed" : "Not saved"}
            </span>
            <button onClick={() => save.mutate()} disabled={save.isPending || !selected} className="rounded-lg bg-neutral-950 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save SEO</button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-neutral-200 bg-white p-3 shadow-sm">
            <input aria-label="Search pages" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search pages" className="mb-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            <div className="max-h-[70vh] space-y-1 overflow-y-auto">
              {filteredPages.map((page) => <button key={page.id} onClick={() => setSelectedId(page.id)} className={`w-full rounded-lg px-3 py-2.5 text-left ${selected?.id === page.id ? "bg-indigo-50 text-indigo-900" : "hover:bg-neutral-50"}`}><span className="block text-sm font-medium">/{page.slug === "home" ? "" : page.slug}</span><span className="mt-0.5 block text-xs text-neutral-500">{page.status} · {page.seo.noIndex ? "noindex" : "indexable"}</span></button>)}
            </div>
          </aside>

          {selected && <section className="space-y-5">
            <details className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <summary className="cursor-pointer text-lg font-semibold text-neutral-950">Global defaults and domains</summary>
              <p className="mt-2 text-sm text-neutral-500">Used when a page has no override. Domain routing still requires the domain to be connected and validated by the hosting configuration.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="Site name" value={globalSeo.siteName || ""} onChange={(value) => setGlobalSeo({ ...globalSeo, siteName: value })} help="Brand name used by social previews" />
                <Field label="Title template" value={globalSeo.titleTemplate || ""} onChange={(value) => setGlobalSeo({ ...globalSeo, titleTemplate: value })} help="Use %s for the page title, for example %s | Ozmishow" />
                <Field label="Primary domain" value={globalSeo.primaryDomain || ""} onChange={(value) => setGlobalSeo({ ...globalSeo, primaryDomain: value })} help="Hostname only; activation requires hosting validation" />
                <Field label="Additional domains" value={(globalSeo.additionalDomains || []).join(", ")} onChange={(value) => setGlobalSeo({ ...globalSeo, additionalDomains: value.split(",").map((item) => item.trim()).filter(Boolean) })} help="Comma separated customer-owned or Ozmishow domains" />
                <Field label="Default social image" value={globalSeo.defaultImage || ""} onChange={(value) => setGlobalSeo({ ...globalSeo, defaultImage: value })} help="Absolute HTTPS URL" />
                <Field label="Default description" value={globalSeo.defaultDescription || ""} onChange={(value) => setGlobalSeo({ ...globalSeo, defaultDescription: value })} help="Fallback only; page-specific descriptions are preferred" />
              </div>
              <button onClick={() => saveGlobal.mutate()} disabled={saveGlobal.isPending} className="mt-5 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-900 disabled:opacity-50">{saveGlobal.isPending ? "Saving…" : "Save global defaults"}</button>
            </details>
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-neutral-950">Page metadata</h2><p className="text-sm text-neutral-500">Stable page ID: {selected.id}</p></div><select aria-label="SEO locale" value={activeLocale} onChange={(event) => setLocale(event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm">{config.enabledLocales.map((item) => <option key={item} value={item}>{item.toUpperCase()}</option>)}</select></div>
              <div className="grid gap-5">
                <Field label="URL slug" value={draft.slug} onChange={(value) => setDraft({ ...draft, slug: value.toLowerCase().trim() })} help={`Preview: ${publicOrigin || "https://your-domain.com"}${publicPath || "/"}`} />
                <Field label="SEO title" value={draft.title} onChange={(value) => setDraft({ ...draft, title: value })} help={`${draft.title.length}/60 characters`} />
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-neutral-800">Meta description</span><textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={4} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><span className="mt-1 block text-xs text-neutral-500">{draft.description.length}/160 characters</span></label>
                <Field label="Keywords" value={draft.keywords} onChange={(value) => setDraft({ ...draft, keywords: value })} help="Optional, comma separated" />
                <Field label="Social sharing image" value={draft.socialImage} onChange={(value) => setDraft({ ...draft, socialImage: value })} help="Use an absolute HTTPS image URL, ideally 1200 × 630" />
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Toggle checked={draft.noIndex} onChange={(checked) => setDraft({ ...draft, noIndex: checked })} title="Prevent indexing" description="Adds noindex and nofollow to this page." />
                <Toggle checked={draft.excludeFromSitemap} onChange={(checked) => setDraft({ ...draft, excludeFromSitemap: checked })} title="Exclude from sitemap" description="Keeps the page public but omits it from sitemap.xml." />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Google preview</h2><div className="mt-4 max-w-2xl rounded-lg border border-neutral-200 p-4"><p className="truncate text-sm text-emerald-700">{publicOrigin || "https://your-domain.com"}{publicPath || "/"}</p><p className="mt-1 text-xl text-blue-700">{draft.title || "Page title"}</p><p className="mt-1 text-sm leading-6 text-neutral-600">{draft.description || "Add a useful description explaining what visitors will find on this page."}</p></div>{publicOrigin && <a href={`${publicOrigin}${publicPath || "/"}`} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:underline">Open public page to confirm →</a>}</div>
          </section>}
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange, help }: { label: string; value: string; onChange: (value: string) => void; help: string }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-medium text-neutral-800">{label}</span><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" /><span className="mt-1 block text-xs text-neutral-500">{help}</span></label>;
}

function Toggle({ checked, onChange, title, description }: { checked: boolean; onChange: (checked: boolean) => void; title: string; description: string }) {
  return <label className="flex cursor-pointer gap-3 rounded-lg border border-neutral-200 p-3"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4" /><span><span className="block text-sm font-medium text-neutral-900">{title}</span><span className="block text-xs leading-5 text-neutral-500">{description}</span></span></label>;
}

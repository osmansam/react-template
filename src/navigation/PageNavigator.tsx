import { useEffect, useRef, useState } from "react";
import { FiChevronRight, FiExternalLink, FiHome, FiMoreHorizontal } from "react-icons/fi";
import { Link } from "react-router-dom";
import { collapsePageNavigatorItems, type PresentedPageNavigatorItem } from "./pageNavigatorPresentation";
import type { ResolvedPageNavigatorItem } from "./pageNavigatorResolver";

function NavigatorLink({ item, first = false, onClick }: { item: ResolvedPageNavigatorItem; first?: boolean; onClick?: () => void }) {
  const content = <>{first && <FiHome aria-hidden className="h-4 w-4 shrink-0" />}<span className="max-w-56 truncate" title={item.label}>{item.label}</span>{item.external && <FiExternalLink aria-hidden className="h-3.5 w-3.5 shrink-0" />}</>;
  const className = "inline-flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-sm font-medium text-neutral-500 transition-colors hover:text-[var(--brand-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2";
  if (item.current || !item.href) return <span aria-current={item.current ? "page" : undefined} className="inline-flex min-w-0 items-center gap-1.5 px-1.5 py-1 text-sm font-semibold text-neutral-900">{content}</span>;
  if (item.external) return <a href={item.href} target={item.openInNewTab ? "_blank" : undefined} rel={item.openInNewTab ? "noopener noreferrer" : undefined} className={className} onClick={onClick}>{content}</a>;
  return <Link to={item.href} className={className} onClick={onClick}>{content}</Link>;
}

function Trail({ entries }: { entries: PresentedPageNavigatorItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapper = useRef<HTMLLIElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => { if (!wrapper.current?.contains(event.target as Node)) setOpen(false); };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, [open]);
  return <ol className="flex min-w-0 items-center gap-1">
    {entries.map((entry, index) => <li key={entry.kind === "item" ? entry.item.id : entry.id} ref={entry.kind === "ellipsis" ? wrapper : undefined} className="relative flex min-w-0 items-center gap-1">
      {index > 0 && <FiChevronRight aria-hidden className="h-4 w-4 shrink-0 text-neutral-300" />}
      {entry.kind === "item" ? <NavigatorLink item={entry.item} first={index === 0} /> : <>
        <button ref={trigger} type="button" aria-label="Show hidden breadcrumb items" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)]"><FiMoreHorizontal aria-hidden /></button>
        {open && <div role="menu" className="absolute left-4 top-full z-[1100] mt-2 min-w-48 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
          {entry.items.map((item) => <div role="none" key={item.id} className="block"><div role="menuitem"><NavigatorLink item={item} onClick={() => setOpen(false)} /></div></div>)}
        </div>}
      </>}
    </li>)}
  </ol>;
}

export function PageNavigator({ items }: { items: ResolvedPageNavigatorItem[] }) {
  if (items.length === 0) return null;
  return <nav aria-label="Breadcrumb" className="mb-4 min-w-0 rounded-xl border border-neutral-200/80 bg-white/90 px-4 py-2.5 shadow-sm backdrop-blur">
    <div className="hidden md:block"><Trail entries={collapsePageNavigatorItems(items, false)} /></div>
    <div className="md:hidden"><Trail entries={collapsePageNavigatorItems(items, true)} /></div>
  </nav>;
}


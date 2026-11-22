import { parseProjectScope, projectPath, type ProjectScope } from "./projectScope";

export function projectSessionStorageKey(name: string, pathname: string): string | null {
  const scope = parseProjectScope(pathname);
  if (!scope) return null;
  return `project:${encodeURIComponent(scope.tenant.toLowerCase())}:${encodeURIComponent(scope.project.toLowerCase())}:${name}`;
}

const fallback = new Map<string, string | null>();
const listeners = new Set<() => void>();

type SessionField = "user" | "loggedIn" | "sessionRevision";
type SessionIdentity = Record<SessionField, string | null>;
interface SessionState {
  pathname: string;
  visible: SessionIdentity;
  delivered: SessionIdentity;
  version: number;
}
const sessions = new Map<string, SessionState>();

function identityValue(field: SessionField, raw: string | null): string | null {
  if (field === "loggedIn") return raw === "true" ? raw : null;
  if (field === "sessionRevision") return raw;
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    const id = user?._id ?? user?.id;
    return typeof id === "string" && id.trim() ? id : null;
  } catch { return null; }
}

function sameIdentity(a: SessionIdentity, b: SessionIdentity) {
  return a.user === b.user && a.loggedIn === b.loggedIn && a.sessionRevision === b.sessionRevision;
}

function sessionKey(pathname: string) {
  return projectSessionStorageKey("user", pathname) ?? "legacy:user";
}

function applyStorageHistory(state: SessionState, previous: SessionIdentity, next: SessionIdentity, revisionEvent = false) {
  const { visible } = sessionState(state.pathname);
  // Older tabs write only user and loggedIn. Leaving the currently visible identity
  // in their ordered event stream reveals an otherwise invisible roundtrip.
  if (!revisionEvent && sameIdentity(previous, visible) && !sameIdentity(next, visible)) state.version++;
  state.delivered = next;
}

function onStorage(event: StorageEvent) {
  if (event.storageArea && event.storageArea !== window.localStorage) return;
  if (event.key === null) {
    for (const key of fallback.keys()) if (key.startsWith("project:")) fallback.delete(key);
    for (const [key, state] of sessions) {
      if (key.startsWith("project:")) {
        applyStorageHistory(state, state.delivered, { user: null, loggedIn: null, sessionRevision: null });
      }
    }
  } else {
    fallback.delete(event.key);
    const field = event.key.slice(event.key.lastIndexOf(":") + 1);
    if (field === "user" || field === "loggedIn" || field === "sessionRevision") {
      const state = sessions.get(event.key.replace(/:[^:]+$/, ":user"));
      if (state) {
        const previous = { ...state.delivered, [field]: identityValue(field, event.oldValue) };
        const next = { ...state.delivered, [field]: identityValue(field, event.newValue) };
        applyStorageHistory(state, previous, next, field === "sessionRevision");
      }
    }
  }
  listeners.forEach(listener => listener());
}

export function subscribeProjectSession(listener: () => void) {
  window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export interface ProjectRequestOwner {
  runtimeScope: ProjectScope | null;
  runtimeSession: number;
}

function sessionState(pathname: string): SessionState {
  const key = sessionKey(pathname);
  const visible = {
    user: identityValue("user", getProjectSessionItem("user", pathname)),
    loggedIn: identityValue("loggedIn", getProjectSessionItem("loggedIn", pathname)),
    sessionRevision: getProjectSessionItem("sessionRevision", pathname),
  };
  const known = sessions.get(key);
  if (known) {
    if (!sameIdentity(known.visible, visible)) {
      known.visible = visible;
      known.version++;
    }
    return known;
  }
  // Pending owners can outlive the last mounted React subscriber.
  if (typeof window !== "undefined") window.addEventListener?.("storage", onStorage);
  const state = { pathname, visible, delivered: visible, version: 1 };
  sessions.set(key, state);
  return state;
}

export function captureProjectRequest(scope: ProjectScope | null): ProjectRequestOwner {
  return { runtimeScope: scope, runtimeSession: sessionState(projectPath(scope, "/")).version };
}

export function ownsProjectRequest(owner: ProjectRequestOwner): boolean {
  return owner.runtimeSession === sessionState(projectPath(owner.runtimeScope, "/")).version;
}

export function getProjectSessionItem(name: string, pathname = window.location.pathname) {
  const key = projectSessionStorageKey(name, pathname);
  if (!key) return fallback.get(`legacy:${name}`) ?? null;
  if (fallback.has(key)) return fallback.get(key) ?? null;
  try { return localStorage.getItem(key); } catch { return null; }
}

function writeSessionItem(name: string, value: string | null, pathname: string) {
  const key = projectSessionStorageKey(name, pathname);
  const field = name === "user" || name === "loggedIn" ? name : undefined;
  const changed = field && sessionState(pathname).visible[field] !== identityValue(field, value);
  if (key) {
    try {
      // Publish the revision first so queued events identify the session their
      // metadata belongs to, including in tabs first opened after the change.
      if (changed) {
        const revisionKey = projectSessionStorageKey("sessionRevision", pathname)!;
        localStorage.setItem(revisionKey, crypto.getRandomValues(new Uint32Array(4)).join("-"));
      }
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
      fallback.delete(key);
    } catch { fallback.set(key, value); }
  } else {
    fallback.set(`legacy:${name}`, value);
  }
  if (field) {
    const state = sessionState(pathname);
    state.delivered = { ...state.delivered, [field]: state.visible[field] };
    if (changed) state.delivered.sessionRevision = state.visible.sessionRevision;
  }
  listeners.forEach(listener => listener());
}

export function setProjectSessionItem(name: string, value: string, pathname = window.location.pathname) {
  writeSessionItem(name, value, pathname);
}

export function removeProjectSessionItem(name: string, pathname = window.location.pathname) {
  writeSessionItem(name, null, pathname);
}

export function clearProjectSession(pathname: string) {
  removeProjectSessionItem("loggedIn", pathname);
  removeProjectSessionItem("user", pathname);
}

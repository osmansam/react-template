export function projectSessionStorageKey(name: string, pathname: string): string | null {
  const parts = pathname.split("/");
  const tenantIndex = parts.indexOf("t");
  const projectIndex = parts.indexOf("p");
  const tenant = parts[tenantIndex + 1]?.trim().toLowerCase();
  const project = parts[projectIndex + 1]?.trim().toLowerCase();
  if (tenantIndex < 0 || projectIndex < 0 || !tenant || !project) return null;
  return `project:${tenant}:${project}:${name}`;
}

export function getProjectSessionItem(name: string, pathname = window.location.pathname) {
  const key = projectSessionStorageKey(name, pathname);
  return key ? localStorage.getItem(key) : null;
}

export function setProjectSessionItem(name: string, value: string, pathname = window.location.pathname) {
  const key = projectSessionStorageKey(name, pathname);
  if (key) localStorage.setItem(key, value);
}

export function removeProjectSessionItem(name: string, pathname = window.location.pathname) {
  const key = projectSessionStorageKey(name, pathname);
  if (key) localStorage.removeItem(key);
}

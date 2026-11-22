import { captureProjectRequest, subscribeProjectSession } from "../utils/projectSessionStorage";
import { useMemo, useSyncExternalStore } from "react";
import { useLocation } from "react-router-dom";
import { parseProjectScope, projectPath } from "../utils/projectScope";

export function useTenantProject() {
  const { pathname } = useLocation();
  const parsed = parseProjectScope(pathname);
  const tenant = parsed?.tenant ?? null;
  const project = parsed?.project ?? null;
  const scope = useMemo(() => tenant && project ? { tenant, project } : null, [tenant, project]);
  const readSession = () => captureProjectRequest(scope).runtimeSession;
  const runtimeSession = useSyncExternalStore(subscribeProjectSession, readSession, readSession);
  return useMemo(() => {
    const requestConfig = { runtimeScope: scope, runtimeSession };
    return { tenant, project, scope, requestConfig, buildPath: (path: string) => projectPath(scope, path) };
  }, [tenant, project, scope, runtimeSession]);
}

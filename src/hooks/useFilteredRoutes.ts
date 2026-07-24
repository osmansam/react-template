import { useMemo } from "react";
import { allRoutes, Routes } from "../navigation/constants";
import { useUserContext } from "../context/User.context";
import { useAuditLogsAuthorizationConfig } from "../utils/api/auditLogs";
import { canAccessAuditLogs } from "../utils/auditLogsAccess";
import { ACCESS_TOKEN } from "../utils/api/axiosClient";
import { decodeJWT } from "../utils/jwtUtils";
import { useDynamicPages } from "./useDynamicPages";

export const useFilteredRoutes = () => {
  const { user } = useUserContext();
  const { dynamicRoutes } = useDynamicPages();
  const tokenRole = decodeJWT(localStorage.getItem(ACCESS_TOKEN) || "")?.role;
  const auditUser = useMemo(
    () => user || (tokenRole ? { role: tokenRole } : undefined),
    [tokenRole, user],
  );
  const auditConfigResponse = useAuditLogsAuthorizationConfig(Boolean(auditUser));
  const auditConfig = auditConfigResponse?.data;

  const routes = useMemo(() => {
    const staticRoutes = allRoutes.filter((route) => {
      if (route.path !== Routes.AuditLogs) return true;
      return canAccessAuditLogs(auditConfig, auditUser);
    });

    return [...staticRoutes, ...dynamicRoutes];
  }, [auditConfig, auditUser, dynamicRoutes]);

  return routes || [];
};

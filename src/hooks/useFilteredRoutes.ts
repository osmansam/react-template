import { useMemo } from "react";
import { allRoutes, Routes } from "../navigation/constants";
import { useUserContext } from "../context/User.context";
import { useAuditLogsAuthorizationConfig } from "../utils/api/auditLogs";
import { canAccessAuditLogs } from "../utils/auditLogsAccess";
import { useDynamicPages } from "./useDynamicPages";

export const useFilteredRoutes = () => {
  const { user } = useUserContext();
  const { dynamicRoutes } = useDynamicPages();
  const auditUser = useMemo(() => user, [user]);
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

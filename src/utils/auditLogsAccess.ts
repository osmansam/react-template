export interface AuditLogsAuthorizationConfig {
  isAuthorized: boolean;
  authorizeRole: string[];
  authorizeRoleNames?: string[];
}

export interface AuditLogsUserLike {
  role?: string;
  roles?: string[];
}

export function getAuditLogUserRoleIds(user: AuditLogsUserLike | undefined) {
  const roleIds = new Set<string>();
  if (user?.role) roleIds.add(user.role);
  user?.roles?.forEach((role) => {
    if (role) roleIds.add(role);
  });
  return Array.from(roleIds);
}

export function canAccessAuditLogs(
  config: AuditLogsAuthorizationConfig | undefined,
  user: AuditLogsUserLike | undefined,
) {
  if (!config) return false;
  if (!config.isAuthorized) return true;
  const userRoleIds = getAuditLogUserRoleIds(user);
  const authorizedRoles = [
    ...config.authorizeRole,
    ...(config.authorizeRoleNames || []),
  ];
  return userRoleIds.some((roleId) => authorizedRoles.includes(roleId));
}

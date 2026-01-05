import { useLocation, useParams } from "react-router-dom";

/**
 * Hook to get tenant and project slugs from URL
 * URL format: /t/:tenant/p/:project/...
 * 
 * Example: /t/acme/p/inventory/audit-logs
 * Returns: { tenant: 'acme', project: 'inventory' }
 */
export function useTenantProject() {
  const params = useParams<{ tenant?: string; project?: string }>();
  const location = useLocation();
  
  // Try to get from params first, fallback to parsing pathname
  let tenant = params.tenant;
  let project = params.project;
  
  // If params are not available, extract from pathname
  if (!tenant || !project) {
    const pathParts = location.pathname.split('/');
    const tIndex = pathParts.indexOf('t');
    const pIndex = pathParts.indexOf('p');
    
    if (tIndex !== -1 && pIndex !== -1 && pathParts[tIndex + 1] && pathParts[pIndex + 1]) {
      tenant = pathParts[tIndex + 1];
      project = pathParts[pIndex + 1];
    }
  }
  
  return {
    tenant: tenant || null,
    project: project || null,
    /**
     * Helper to construct full paths with tenant/project
     * Example: buildPath('/audit-logs') => '/t/acme/p/inventory/audit-logs'
     */
    buildPath: (path: string) => {
      if (tenant && project) {
        // Ensure path starts with /
        const cleanPath = path.startsWith('/') ? path : `/${path}`;
        return `/t/${tenant}/p/${project}${cleanPath}`;
      }
      return path;
    }
  };
}

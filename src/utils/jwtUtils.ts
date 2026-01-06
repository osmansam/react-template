/**
 * Decode JWT token without verification (client-side)
 * Note: This is only for reading claims, NOT for security validation
 * Server must validate the token signature
 */
export function decodeJWT(token: string): {
  userId?: string;
  role?: string;
  tenantId?: string;
  projectId?: string;
  tenantSlug?: string;
  projectSlug?: string;
  exp?: number;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const claims = JSON.parse(decodedPayload);

    return {
      userId: claims.user_id,
      role: claims.role,
      tenantId: claims.tenant_id,
      projectId: claims.project_id,
      tenantSlug: claims.tenant_slug,
      projectSlug: claims.project_slug,
      exp: claims.exp,
    };
  } catch (error) {
    console.error("Failed to decode JWT:", error);
    return null;
  }
}

/**
 * Check if JWT token has expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  return decoded.exp < currentTime;
}

/**
 * Validate that JWT token matches the current tenant and project slugs from URL
 */
export function validateTokenForTenantProject(
  token: string,
  urlTenantSlug: string,
  urlProjectSlug: string
): boolean {
  const decoded = decodeJWT(token);

  console.log("🔍 JWT Validation:", {
    urlTenantSlug,
    urlProjectSlug,
    tokenTenantSlug: decoded?.tenantSlug,
    tokenProjectSlug: decoded?.projectSlug,
    decoded,
  });

  if (!decoded) {
    console.warn("❌ Failed to decode JWT");
    return false;
  }

  // Check if token is expired
  if (isTokenExpired(token)) {
    console.warn("❌ Token is expired");
    return false;
  }

  // Validate tenant and project slugs match
  const isValid =
    decoded.tenantSlug === urlTenantSlug &&
    decoded.projectSlug === urlProjectSlug;

  console.log("✅ Slug match result:", isValid);
  return isValid;
}

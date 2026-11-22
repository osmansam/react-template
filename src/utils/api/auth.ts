import { currentProjectScope, projectPath, projectQueryKey } from "../projectScope";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useUserContext } from "../../context/User.context";
import { baseQueryOptions } from "../../config/queryClient";
import { useTenantProject } from "../../hooks/useTenantProject";
import { User } from "../../types";
// import { Routes } from "../../navigation/constants";
import { get, post } from "./index";
import { redirectAfterAuth } from "./authRedirect";
import { notifyApiError } from "./errorMessage";
import { clearProjectSession, ownsProjectRequest, type ProjectRequestOwner, removeProjectSessionItem, setProjectSessionItem } from "../projectSessionStorage";

interface LoginError {
  response: {
    data: {
      message: string;
      statusCode: number;
    };
  };
}

export type LoginCredentials = Record<string, unknown>;

export interface LoginConfigField {
  name: string;
  type: string;
  isHashed?: boolean;
  isLoginCredential?: boolean;
  displayName?: string;
}

export interface LoginConfig {
  schemaName: string;
  isRegisterActive: boolean;
  isGoogleLoginActive: boolean;
  loginFields: LoginConfigField[];
  registerFields: LoginConfigField[];
}

export function getLoginConfigFieldLabel(field: LoginConfigField) {
  return field.displayName || field.name;
}

export function useLoginConfig() {
  const { scope, requestConfig } = useTenantProject();
  return useQuery({
    queryKey: projectQueryKey(scope, ["auth", "login-config"]),
    queryFn: ({ signal }) => get<LoginConfig>({ path: "/auth/login-config", config: { ...requestConfig, signal } }),
    ...baseQueryOptions,
  });
}

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    user: User;
  };
}

async function loginMethod(payload: LoginCredentials, config: ProjectRequestOwner) {
  return post<LoginCredentials, LoginResponse>({
    config,
    path: "/auth/login",
    payload,
  });
}

export function useLogin(
  redirectPath?: string,
  onError?: (error: unknown) => void,
) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setUser } = useUserContext();
  const { buildPath, scope, requestConfig } = useTenantProject();

  const { mutate: login, isPending } = useMutation<
    LoginResponse,
    LoginError,
    LoginCredentials
  >({
    mutationKey: projectQueryKey(scope, ["login", requestConfig.runtimeSession]),
    mutationFn: payload => loginMethod(payload, requestConfig),
    onSuccess: async (response: LoginResponse) => {
      if (!ownsProjectRequest(requestConfig)) return;
      const { user } = response.data;
      setProjectSessionItem("loggedIn", "true", buildPath("/"));

      if (user) {
        setUser(user);
      }

      if (projectPath(currentProjectScope(), "/") !== buildPath("/")) return;

      toast.success(t("Logged in successfully"));

      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      // Full page redirect reloads routes/containers with the new token, then the
      // root route selects the configured main page.
      redirectAfterAuth(buildPath);
    },

    onError: (error) => {
      if (!ownsProjectRequest(requestConfig)) return;
      notifyApiError(error, t, toast.error, "Login failed");
      onError?.(error);
    },
  });
  return { login, isPending };
}

async function registerMethod(
  payload: LoginCredentials & { schemaName: string }, config: ProjectRequestOwner,
) {
  return post<LoginCredentials, LoginResponse>({
    config,
    path: `/auth/register?schemaName=${payload.schemaName}`,
    payload,
  });
}

export function useRegister(
  redirectPath?: string,
  onError?: (error: unknown) => void,
) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setUser } = useUserContext();
  const { buildPath, scope, requestConfig } = useTenantProject();

  const { mutate: register, isPending } = useMutation<
    LoginResponse,
    LoginError,
    LoginCredentials & { schemaName: string }
  >({
    mutationKey: projectQueryKey(scope, ["register", requestConfig.runtimeSession]),
    mutationFn: payload => registerMethod(payload, requestConfig),
    onSuccess: async (response: LoginResponse) => {
      if (!ownsProjectRequest(requestConfig)) return;
      const { user } = response.data;
      setProjectSessionItem("loggedIn", "true", buildPath("/"));

      if (user) {
        setUser(user);
      }

      if (projectPath(currentProjectScope(), "/") !== buildPath("/")) return;

      toast.success(t("Registered successfully"));

      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      redirectAfterAuth(buildPath);
    },

    onError: (error) => {
      if (!ownsProjectRequest(requestConfig)) return;
      notifyApiError(error, t, toast.error, "Registration failed");
      onError?.(error);
    },
  });
  return { register, isPending };
}

async function logoutMethod(config: ProjectRequestOwner) {
  return post<undefined, { success: boolean }>({
    config,
    path: "/auth/logout",
    payload: undefined,
  });
}

export function useLogout(onError?: (error: unknown) => void) {
  const navigate = useNavigate();
  const { setUser } = useUserContext();
  const { buildPath, scope, requestConfig } = useTenantProject();
  const { t } = useTranslation();
  const { mutateAsync: logout } = useMutation({
    mutationKey: projectQueryKey(scope, ["logout", requestConfig.runtimeSession]),
    mutationFn: () => logoutMethod(requestConfig),
    onSuccess: () => {
      if (!ownsProjectRequest(requestConfig)) return;
      const pathname = buildPath("/");
      clearProjectSession(pathname);
      setProjectSessionItem("loggedOut", "true", pathname);
      setTimeout(() => removeProjectSessionItem("loggedOut", pathname), 500);
      setUser(undefined);
      if (projectPath(currentProjectScope(), "/") === pathname) navigate(buildPath("/login"));
    },
    onError: error => {
      if (!ownsProjectRequest(requestConfig)) return;
      notifyApiError(error, t, toast.error, "Logout failed");
      onError?.(error);
    },
  });

  return { logout };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
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

async function getLoginConfigMethod() {
  return get<LoginConfig>({ path: "/auth/login-config" });
}

export function useLoginConfig() {
  return useQuery({
    queryKey: ["auth", "login-config"],
    queryFn: getLoginConfigMethod,
    ...baseQueryOptions,
  });
}

export interface LoginResponse {
  status: number;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    user: User;
  };
}

async function loginMethod(payload: LoginCredentials) {
  return post<LoginCredentials, LoginResponse>({
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
  const queryClient = useQueryClient();
  const { buildPath } = useTenantProject();

  const { mutate: login } = useMutation<
    LoginResponse,
    LoginError,
    LoginCredentials
  >({
    mutationFn: loginMethod,
    // We are updating tables query data with new item
    onSuccess: async (response: LoginResponse) => {
      const { accessToken, refreshToken, user } = response.data;

      // Set token in both cookie and localStorage FIRST
      Cookies.set("jwt", accessToken, { expires: 7, sameSite: "lax" }); // 7 days expiry
      localStorage.setItem("jwt", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("loggedIn", "true");

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
      }

      queryClient.clear();

      toast.success(t("Logged in successfully"));

      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      // Full page redirect reloads routes/containers with the new token, then the
      // root route selects the configured main page.
      redirectAfterAuth(buildPath);
    },

    onError,
  });
  return { login };
}

async function registerMethod(
  payload: LoginCredentials & { schemaName: string },
) {
  return post<LoginCredentials, LoginResponse>({
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
  const queryClient = useQueryClient();
  const { buildPath } = useTenantProject();

  const { mutate: register } = useMutation<
    LoginResponse,
    LoginError,
    LoginCredentials & { schemaName: string }
  >({
    mutationFn: registerMethod,
    onSuccess: async (response: LoginResponse) => {
      const { accessToken, refreshToken, user } = response.data;

      // Set token in both cookie and localStorage FIRST
      Cookies.set("jwt", accessToken, { expires: 7, sameSite: "lax" }); // 7 days expiry
      localStorage.setItem("jwt", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("loggedIn", "true");

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
        setUser(user);
      }

      queryClient.clear();

      toast.success(t("Registered successfully"));

      if (redirectPath) {
        navigate(redirectPath);
        return;
      }

      redirectAfterAuth(buildPath);
    },

    onError,
  });
  return { register };
}

async function logoutMethod() {
  return post<undefined, { success: boolean }>({
    path: "/auth/logout",
    payload: undefined,
  });
}

export function useLogout(onError?: (error: unknown) => void) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser } = useUserContext();
  const { mutateAsync: logout } = useMutation({
    mutationFn: logoutMethod,
    onSuccess: () => {
      // Extract tenant/project from current URL before clearing
      const pathParts = window.location.pathname.split("/");
      const tIndex = pathParts.indexOf("t");
      const pIndex = pathParts.indexOf("p");
      const tenant = tIndex !== -1 ? pathParts[tIndex + 1] : "";
      const project = pIndex !== -1 ? pathParts[pIndex + 1] : "";

      localStorage.clear();
      localStorage.setItem("loggedOut", "true");
      setTimeout(() => localStorage.removeItem("loggedOut"), 500);
      Cookies.remove("jwt");
      setUser(undefined);
      queryClient.clear();

      // Redirect to login with tenant/project context preserved
      const loginPath =
        tenant && project ? `/t/${tenant}/p/${project}/login` : "/login";
      navigate(loginPath);
    },
    onError,
  });

  return { logout };
}

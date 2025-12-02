import { useMutation } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";
import { Location, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
// import { Routes } from "../../navigation/constants";
import { post } from "./index";

interface LoginError {
  response: {
    data: {
      message: string;
      statusCode: number;
    };
  };
}

export type LoginCredentials = Record<string, any>;

export interface LoginResponse {
  token: string;
}

async function loginMethod(payload: LoginCredentials) {
  return post<LoginCredentials, LoginResponse>({
    path: "/auth/login",
    payload,
  });
}

export function useLogin(
  location?: Location,
  onError?: (error: unknown) => void
) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { mutate: login } = useMutation<
    LoginResponse,
    LoginError,
    LoginCredentials
  >({
    mutationFn: loginMethod,
    // We are updating tables query data with new item
    onSuccess: async (response: LoginResponse) => {
      const { token } = response;
      Cookies.set("jwt", token);
      toast.success(t("Logged in successfully"));
      localStorage.setItem("jwt", token);
      localStorage.setItem("loggedIn", "true");
      const target = location
        ? `${location.pathname}${location.search}`
        : // : Routes.HOME; // If no location is provided, redirect to home page
          "/";
      navigate(target);
    },

    onError,
  });
  return { login };
}

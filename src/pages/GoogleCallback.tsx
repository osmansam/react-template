import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { axiosClient } from "../utils/api/axiosClient";
import { setProjectSessionItem } from "../utils/projectSessionStorage";
import { redirectAfterGoogleLogin, refreshAfterGoogleLogin } from "./googleCallbackAuth";

const GoogleCallback = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const processed = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    void (async () => {
      try {
        const { data } = await axiosClient.get("/auth/session");
        if (!data?.authenticated) throw new Error("Authentication session was not created");
        setProjectSessionItem("loggedIn", "true");
        if (data.user) setProjectSessionItem("user", JSON.stringify(data.user));
        await refreshAfterGoogleLogin(queryClient);
        setStatus("success");
        toast.success(t("Logged in successfully"));
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", user: data.user }, window.location.origin);
          setTimeout(() => window.close(), 500);
        } else {
          const parts = window.location.pathname.split("/");
          const tenant = parts[parts.indexOf("t") + 1];
          const project = parts[parts.indexOf("p") + 1];
          redirectAfterGoogleLogin((path) => `/t/${tenant}/p/${project}${path}`);
        }
      } catch (error) {
        setStatus("error");
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: String(error) }, window.location.origin);
        }
      }
    })();
  }, [queryClient, t]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="rounded-lg bg-white p-8 text-center shadow">
        {status === "loading" && <p>{t("Processing...")}</p>}
        {status === "success" && <p>{t("Login successful")}</p>}
        {status === "error" && <p className="text-red-600">{t("Google login failed")}</p>}
      </div>
    </div>
  );
};

export default GoogleCallback;

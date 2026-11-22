import { useTenantProject } from "../hooks/useTenantProject";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { axiosClient } from "../utils/api/axiosClient";
import { setProjectSessionItem } from "../utils/projectSessionStorage";
import { redirectAfterGoogleLogin } from "./googleCallbackAuth";

const GoogleCallback = () => {
  const { buildPath, requestConfig } = useTenantProject();
  const { t } = useTranslation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const { data } = await axiosClient.get("/auth/session", { signal: controller.signal, ...requestConfig });
        if (controller.signal.aborted) return;
        if (!data?.authenticated) throw new Error("Authentication session was not created");
        setStatus("success");
        toast.success(t("Logged in successfully"));
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "GOOGLE_AUTH_SUCCESS", user: data.user }, window.location.origin);
          setTimeout(() => window.close(), 500);
        } else {
          const pathname = buildPath("/");
          setProjectSessionItem("loggedIn", "true", pathname);
          if (data.user) setProjectSessionItem("user", JSON.stringify(data.user), pathname);
          redirectAfterGoogleLogin(buildPath);
        }
      } catch (error) {
        if (controller.signal.aborted) return;
        setStatus("error");
        if (window.opener && !window.opener.closed) {
          window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: String(error) }, window.location.origin);
        }
      }
    })();
    return () => controller.abort();
  }, [buildPath, requestConfig, t]);

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

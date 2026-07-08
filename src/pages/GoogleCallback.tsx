import { useQueryClient } from "@tanstack/react-query";
import Cookies from "js-cookie";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  redirectAfterGoogleLogin,
  refreshAfterGoogleLogin,
} from "./googleCallbackAuth";

const GoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const hasProcessedCallback = useRef(false);
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      if (hasProcessedCallback.current) return;
      hasProcessedCallback.current = true;

      try {
        // Check if this page was opened in a popup (has window.opener)
        const isPopup = window.opener && !window.opener.closed;

        // Try to get tokens from URL parameters first
        const accessToken = searchParams.get("accessToken");
        const refreshToken = searchParams.get("refreshToken");
        const code = searchParams.get("code");
        const errorParam = searchParams.get("error");

        if (errorParam) {
          setStatus("error");
          setMessage(searchParams.get("message") || "Google login failed");

          if (isPopup) {
            window.opener.postMessage(
              { type: "GOOGLE_AUTH_ERROR", error: errorParam },
              window.location.origin
            );
            setTimeout(() => window.close(), 1500);
          }
          return;
        }

        if (accessToken) {
          const userStr = searchParams.get("user");
          const user = userStr ? JSON.parse(userStr) : undefined;
          await handleLoginSuccess(accessToken, refreshToken, user, isPopup);
          return;
        }

        // Case 2: We got an authorization code (Google redirected to Frontend, or Backend forwarded code)
        if (code) {
          setStatus("loading");
          setMessage("Exchanging code for tokens...");

          try {
            // Call backend to exchange code
            // We must pass both code and state for validation
            const state = searchParams.get("state");

            // Extract tenant and project from current URL path
            const pathParts = window.location.pathname.split("/");
            const tIndex = pathParts.indexOf("t");
            const pIndex = pathParts.indexOf("p");
            const tenant = tIndex !== -1 ? pathParts[tIndex + 1] : "";
            const project = pIndex !== -1 ? pathParts[pIndex + 1] : "";

            // Ensure API URL doesn't have trailing slash for consistent construction
            const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");
            console.log(tenant, project);
            const callbackUrl =
              tenant && project
                ? `${baseUrl}/${tenant}/${project}/auth/google/callback?code=${code}&state=${
                    state || ""
                  }`
                : `${baseUrl}/auth/google/callback?code=${code}&state=${
                    state || ""
                  }`;

            const response = await fetch(callbackUrl);
            const data = await response.json();

            if (data.status === 200 && data.data?.accessToken) {
              await handleLoginSuccess(
                data.data.accessToken,
                data.data.refreshToken,
                data.data.user,
                isPopup
              );
              return;
            } else {
              throw new Error(data.message || "Failed to exchange token");
            }
          } catch (err) {
            console.error("Token exchange failed:", err);
            setStatus("error");
            setMessage("Failed to complete login with server");
            return;
          }
        }

        // Case 3: JSON response in body (Backend returned JSON)
        const bodyTextFull = document.body.innerText;
        try {
          const jsonMatch = bodyTextFull.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.status === 200 && data.data?.accessToken) {
              await handleLoginSuccess(
                data.data.accessToken,
                data.data.refreshToken,
                data.data.user,
                isPopup
              );
              return;
            }
          }
        } catch (e) {
          console.error("Failed to parse JSON response:", e);
        }

        // If we get here, we couldn't find tokens
        setStatus("error");
        setMessage(
          "Could not retrieve authentication tokens. Check backend logs."
        );

        if (isPopup) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_ERROR", error: "No tokens found" },
            window.location.origin
          );
          setTimeout(() => window.close(), 2000);
        }
      } catch (error) {
        console.error("Google OAuth callback error:", error);
        setStatus("error");
        setMessage("An error occurred during login");

        if (window.opener && !window.opener.closed) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_ERROR", error: String(error) },
            window.location.origin
          );
          setTimeout(() => window.close(), 2000);
        }
      }
    };

    const handleLoginSuccess = async (
      accessToken: string,
      refreshToken: string | null | undefined,
      user: unknown,
      isPopup: boolean | null
    ) => {
      setStatus("success");
      setMessage("Login successful!");

      // Store tokens
      Cookies.set("jwt", accessToken);
      localStorage.setItem("jwt", accessToken);
      localStorage.setItem("loggedIn", "true");

      if (refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      }

      await refreshAfterGoogleLogin(queryClient);

      toast.success(t("Logged in successfully"));

      if (isPopup) {
        window.opener.postMessage(
          {
            type: "GOOGLE_AUTH_SUCCESS",
            accessToken,
            refreshToken,
            user,
          },
          window.location.origin
        );
        setTimeout(() => window.close(), 500);
      } else {
        // Redirect to home page with tenant/project context
        const pathParts = window.location.pathname.split("/");
        const tIndex = pathParts.indexOf("t");
        const pIndex = pathParts.indexOf("p");
        const tenant = tIndex !== -1 ? pathParts[tIndex + 1] : "";
        const project = pIndex !== -1 ? pathParts[pIndex + 1] : "";

        const buildPath = (path: string) =>
          tenant && project ? `/t/${tenant}/p/${project}${path}` : path;

        setTimeout(() => redirectAfterGoogleLogin(buildPath), 500);
      }
    };

    // Small delay to ensure DOM is fully loaded
    setTimeout(handleCallback, 100);
  }, [searchParams, queryClient, t]);

  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="flex flex-col items-center">
          {status === "loading" && (
            <>
              <div className="animate-spin h-12 w-12 border-4 border-indigo-600 border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-800 font-semibold mb-2">
                {t("Processing...")}
              </p>
              <p className="text-gray-600 text-sm">{t("Please wait")}</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="h-12 w-12 bg-green-100 rounded-full mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold mb-2">
                {t("Success!")}
              </p>
              <p className="text-gray-600 text-sm text-center">{message}</p>
              <p className="text-gray-500 text-xs mt-2">
                {t("This window will close automatically...")}
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="h-12 w-12 bg-red-100 rounded-full mb-4 flex items-center justify-center">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-gray-800 font-semibold mb-2">
                {t("Authentication Error")}
              </p>
              <p className="text-gray-600 text-sm text-center">{message}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCallback;

import Cookies from "js-cookie";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { FcGoogle } from "react-icons/fc";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { GenericButton } from "../components/panelComponents/FormElements/GenericButton";
import TextInput from "../components/panelComponents/FormElements/TextInput";
import { H1, H5 } from "../components/panelComponents/Typography";
import { useUserContext } from "../context/User.context";
import { useLogin } from "../utils/api/auth";
import { ContainerModel, useGetContainers } from "../utils/api/container";
import { getFieldLabel } from "../utils/genericPageHelpers";

const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const containers = useGetContainers();
  const [authContainer, setAuthContainer] = useState<ContainerModel | null>(
    null
  );
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { setUser } = useUserContext();

  const { login } = useLogin(location.state?.from || "/");

  useEffect(() => {
    if (containers) {
      const auth = containers.find((c) => c.isAuthContainer);
      if (auth) {
        setAuthContainer(auth);
      }
    }
  }, [containers]);

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(formData);
  };

  const handleGoogleLogin = () => {
    // Open Google OAuth in a popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    
    const popup = window.open(
      `${import.meta.env.VITE_API_URL}auth/google/login`,
      'Google Login',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    // Listen for messages from the popup
    const handleMessage = (event: MessageEvent) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        const { accessToken, refreshToken, user } = event.data;
        // Store tokens
        Cookies.set('jwt', accessToken);
        localStorage.setItem('jwt', accessToken);
        localStorage.setItem('loggedIn', 'true');
        
        if (refreshToken) {
          localStorage.setItem('refreshToken', refreshToken);
        }

        if (user) {
          localStorage.setItem("user", JSON.stringify(user));
          setUser(user);
        }
        
        toast.success(t('Logged in successfully'));
        navigate(location.state?.from || '/');
        
        // Close popup
        if (popup) popup.close();
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        toast.error(t('Google login failed'));
        if (popup) popup.close();
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Clean up listener when component unmounts or popup closes
    const checkPopupClosed = setInterval(() => {
      if (popup?.closed) {
        window.removeEventListener('message', handleMessage);
        clearInterval(checkPopupClosed);
      }
    }, 500);
  };

  if (!authContainer) {
    if (containers && containers.length > 0) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-red-600 mb-2">
              Configuration Error
            </h2>
            <p className="text-gray-600">
              No authentication container found. Please set{" "}
              <code className="bg-gray-100 px-1 rounded">
                IsAuthContainer: true
              </code>{" "}
              for one of your containers in the backend.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 bg-gray-200 rounded-full mb-4"></div>
          <div className="h-4 w-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const loginFields = authContainer.fields.filter((f) => f.isLoginCredential);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8">
          <div className="text-center mb-10">
            <H1 className="text-3xl font-bold text-gray-900 mb-2">
              {t("Welcome Back")}
            </H1>
            <H5 className="text-gray-500 font-normal">
              {t("Please sign in to continue")}
            </H5>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {loginFields.map((field) => (
              <TextInput
                key={field.name}
                label={getFieldLabel(field)}
                type={field.isHashed ? "password" : "text"}
                value={formData[field.name] || ""}
                onChange={(val) => handleInputChange(field.name, val)}
                placeholder={t(`Enter your ${field.name}`)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
              />
            ))}

            <GenericButton
              type="submit"
              variant="primary"
              className="w-full py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            >
              {t("Sign In")}
            </GenericButton>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  {t("Or continue with")}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
              >
                <FcGoogle className="h-6 w-6 mr-2" />
                <span>{t("Sign in with Google")}</span>
              </button>
            </div>
          </div>
        </div>
        <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            {t("Don't have an account?")}{" "}
            <a
              href="#"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t("Contact support")}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

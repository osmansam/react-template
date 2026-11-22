import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
// import translationEn from "../locales/en/ translation.json";
// import translationTr from "../locales/tr/ translation.json";

const resources = {
  // en: {
  //   translation: translationEn,
  // },
  // tr: {
  //   translation: translationTr,
  // },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    debug: true,
    interpolation: {
      escapeValue: false,
    },
  });

export function createProjectTranslations() {
  const instance = i18n.createInstance();
  void instance.init({
    ...i18n.options,
    lng: i18n.language,
    resources: structuredClone(resources),
    initImmediate: false,
  });
  return instance;
}

export default i18n;

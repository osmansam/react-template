import i18next from "i18next";
import { describe, expect, it } from "vitest";
import {
  catalogFromRuntimeTranslations,
  installRuntimeTranslations,
} from "./runtimeTranslations";

describe("installRuntimeTranslations", () => {
  it("makes tenant-created labels available to i18next", async () => {
    const instance = i18next.createInstance();
    await instance.init({ lng: "en", fallbackLng: "en", resources: {} });

    installRuntimeTranslations(instance, "tr", {
      "Customer Name": "Müşteri Adı",
    });

    expect(instance.t("Customer Name", { lng: "tr" })).toBe("Müşteri Adı");
  });
});

describe("catalogFromRuntimeTranslations", () => {
  it("preserves source labels exactly as i18next keys", () => {
    expect(catalogFromRuntimeTranslations([
      { sourceText: "Email", translatedText: "E-posta" },
      { sourceText: "Product Name", translatedText: "Ürün Adı" },
    ])).toEqual({
      Email: "E-posta",
      "Product Name": "Ürün Adı",
    });
  });

  it("accepts the legacy object response during rolling restarts", () => {
    expect(catalogFromRuntimeTranslations({
      email: "E-posta",
      productName: "Ürün Adı",
    })).toEqual({
      email: "E-posta",
      Email: "E-posta",
      productName: "Ürün Adı",
      "Product Name": "Ürün Adı",
    });
  });
});

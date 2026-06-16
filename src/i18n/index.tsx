import { createContext, useContext, createSignal, ParentComponent } from "solid-js";
import { zh, Translations } from "./zh";
import { en } from "./en";

type Locale = "zh" | "en";

interface I18nContextType {
  locale: () => Locale;
  t: () => Translations;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const translations: Record<Locale, Translations> = { zh, en };

const I18nContext = createContext<I18nContextType>();

export const I18nProvider: ParentComponent = (props) => {
  const [locale, setLocale] = createSignal<Locale>("zh");

  const t = () => translations[locale()];

  const toggleLocale = () => {
    setLocale((prev) => (prev === "zh" ? "en" : "zh"));
  };

  const contextValue: I18nContextType = {
    locale,
    t,
    setLocale,
    toggleLocale,
  };

  return (
    <I18nContext.Provider value={contextValue}>
      {props.children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
};

export type { Locale, Translations };

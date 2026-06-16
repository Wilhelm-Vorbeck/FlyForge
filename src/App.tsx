import { Component } from "solid-js";
import { AppProvider } from "./store";
import { I18nProvider } from "./i18n";
import Layout from "./components/Layout";

const App: Component = () => {
  return (
    <I18nProvider>
      <AppProvider>
        <Layout />
      </AppProvider>
    </I18nProvider>
  );
};

export default App;

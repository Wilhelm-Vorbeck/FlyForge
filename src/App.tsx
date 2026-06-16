import { Component } from "solid-js";
import { AppProvider } from "./store";
import { I18nProvider } from "./i18n";
import ErrorBoundary from "./components/ErrorBoundary";
import Layout from "./components/Layout";

const App: Component = () => {
  return (
    <ErrorBoundary>
      <I18nProvider>
        <AppProvider>
          <Layout />
        </AppProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
};

export default App;

import { Component } from "solid-js";
import { AppProvider } from "./store";
import Layout from "./components/Layout";

const App: Component = () => {
  return (
    <AppProvider>
      <Layout />
    </AppProvider>
  );
};

export default App;

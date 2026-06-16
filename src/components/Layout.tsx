import { Component, createSignal } from "solid-js";
import AccordionPanel from "./AccordionPanel";
import VisualizationPanel from "./VisualizationPanel";
import ResultsPanel from "./ResultsPanel";
import Header from "./Header";

const Layout: Component = () => {
  return (
    <div class="flex flex-col h-screen overflow-hidden bg-gray-900 text-white">
      <Header />
      <div class="flex flex-1 overflow-hidden min-h-0">
        {/* Left: Parameters */}
        <aside class="w-56 flex-shrink-0 overflow-y-auto bg-gray-800 border-r border-gray-700">
          <AccordionPanel />
        </aside>

        {/* Center: Visualization */}
        <main class="flex-1 overflow-auto min-w-0 bg-gray-900 p-3">
          <VisualizationPanel />
        </main>

        {/* Right: Results */}
        <aside class="w-64 flex-shrink-0 overflow-y-auto bg-gray-800 border-l border-gray-700 p-3">
          <ResultsPanel />
        </aside>
      </div>
    </div>
  );
};

export default Layout;

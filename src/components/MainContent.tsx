import { Component, createSignal } from "solid-js";
import { useAppContext } from "../store";
import ResultsPanel from "./ResultsPanel";
import VisualizationPanel from "./VisualizationPanel";

type TabId = "results" | "visualization";

const MainContent: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>("results");
  const context = useAppContext();

  return (
    <div class="h-full flex flex-col">
      {/* Tab navigation */}
      <div class="bg-gray-800 border-b border-gray-700 px-4">
        <nav class="flex space-x-4">
          <button
            onClick={() => setActiveTab("results")}
            class={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab() === "results"
                ? "text-blue-400 border-blue-400"
                : "text-gray-400 border-transparent hover:text-white"
            }`}
          >
            计算结果
          </button>
          <button
            onClick={() => setActiveTab("visualization")}
            class={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab() === "visualization"
                ? "text-blue-400 border-blue-400"
                : "text-gray-400 border-transparent hover:text-white"
            }`}
          >
            可视化
          </button>
        </nav>
      </div>

      {/* Content */}
      <div class="flex-1 overflow-auto p-4">
        {activeTab() === "results" && <ResultsPanel />}
        {activeTab() === "visualization" && <VisualizationPanel />}
      </div>
    </div>
  );
};

export default MainContent;

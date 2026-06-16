import { Component, createSignal, createEffect } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType, FlywheelTypeNames } from "../types";
import { runSimulationWithState } from "../services/api";
import GeometryTab from "./tabs/GeometryTab";
import MaterialTab from "./tabs/MaterialTab";
import OperatingTab from "./tabs/OperatingTab";
import PresetSelector from "./PresetSelector";

type TabId = "geometry" | "material" | "operating" | "presets";

const SIDEBAR_TABS: { id: TabId; label: string }[] = [
  { id: "geometry", label: "几何" },
  { id: "material", label: "材料" },
  { id: "operating", label: "工况" },
  { id: "presets", label: "预设" },
];

const Sidebar: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>("geometry");
  const [autoRun, setAutoRun] = createSignal(false);
  const context = useAppContext();

  let debounceTimer: ReturnType<typeof setTimeout>;
  createEffect(() => {
    const params = context.state().params;
    if (!autoRun()) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!context.state().isLoading) {
        runSimulationWithState(
          params,
          context.setLoading,
          context.setError,
          context.setSimulation
        );
      }
    }, 500);
  });

  return (
    <div class="h-full flex flex-col">
      {/* Tab navigation - horizontal text only */}
      <div class="flex border-b border-gray-700 bg-gray-800">
        {SIDEBAR_TABS.map((tab) => (
          <button
            onClick={() => setActiveTab(tab.id)}
            class={`flex-1 py-2.5 text-xs font-medium transition-colors ${
              activeTab() === tab.id
                ? "text-blue-400 border-b-2 border-blue-400 bg-gray-700/50"
                : "text-gray-400 hover:text-white hover:bg-gray-700/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div class="flex-1 overflow-auto px-3 py-3 space-y-3">
        {activeTab() === "geometry" && <GeometryTab />}
        {activeTab() === "material" && <MaterialTab />}
        {activeTab() === "operating" && <OperatingTab />}
        {activeTab() === "presets" && <PresetSelector />}
      </div>

      {/* Bottom controls */}
      <div class="border-t border-gray-700 px-3 py-2 space-y-2">
        {/* Flywheel type selector */}
        <select
          value={context.state().params.flywheel_type}
          onChange={(e) =>
            context.setParams({
              flywheel_type: parseInt(e.target.value) as FlywheelType,
            })
          }
          class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(FlywheelTypeNames).map(([value, names]) => (
            <option value={value}>{names.zh}</option>
          ))}
        </select>

        {/* Auto-run toggle */}
        <label class="flex items-center space-x-2 cursor-pointer">
          <div
            class={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${
              autoRun() ? "bg-blue-600" : "bg-gray-600"
            }`}
            onClick={() => setAutoRun(!autoRun())}
          >
            <div
              class={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                autoRun() ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </div>
          <span class="text-xs text-gray-400">自动计算</span>
        </label>
      </div>
    </div>
  );
};

export default Sidebar;

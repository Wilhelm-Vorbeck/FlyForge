import { Component, createSignal, For, createEffect } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType, FlywheelTypeNames } from "../types";
import GeometryTab from "./tabs/GeometryTab";
import MaterialTab from "./tabs/MaterialTab";
import OperatingTab from "./tabs/OperatingTab";
import PresetSelector from "./PresetSelector";
import { runSimulationWithState } from "../services/api";

type SectionId = "geometry" | "material" | "operating" | "presets";

const SECTIONS: { id: SectionId; title: string; icon: string }[] = [
  { id: "geometry", title: "几何尺寸", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
  { id: "material", title: "材料选择", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
  { id: "operating", title: "工况参数", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  { id: "presets", title: "预设方案", icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" },
];

const AccordionPanel: Component = () => {
  const [openSection, setOpenSection] = createSignal<SectionId | null>("geometry");
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

  const toggle = (id: SectionId) => {
    setOpenSection(openSection() === id ? null : id);
  };

  return (
    <div class="flex flex-col h-full">
      {/* Flywheel type */}
      <div class="px-3 py-2 border-b border-gray-700">
        <label class="text-[10px] text-gray-500 block mb-1">飞轮类型</label>
        <select
          value={context.state().params.flywheel_type}
          onChange={(e) =>
            context.setParams({
              flywheel_type: parseInt(e.target.value) as FlywheelType,
            })
          }
          class="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {Object.entries(FlywheelTypeNames).map(([value, names]) => (
            <option value={value}>{names.zh}</option>
          ))}
        </select>
      </div>

      {/* Accordion sections */}
      <div class="flex-1 overflow-y-auto">
        <For each={SECTIONS}>
          {(section) => (
            <div class="border-b border-gray-700">
              {/* Section header */}
              <button
                onClick={() => toggle(section.id)}
                class={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  openSection() === section.id
                    ? "bg-blue-900/30 text-blue-400"
                    : "text-gray-400 hover:bg-gray-700/50 hover:text-white"
                }`}
              >
                <span>{section.title}</span>
                <svg
                  class={`w-3.5 h-3.5 transition-transform ${
                    openSection() === section.id ? "rotate-90" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>

              {/* Section content */}
              {openSection() === section.id && (
                <div class="px-3 py-2 bg-gray-800/50">
                  {section.id === "geometry" && <GeometryTab />}
                  {section.id === "material" && <MaterialTab />}
                  {section.id === "operating" && <OperatingTab />}
                  {section.id === "presets" && <PresetSelector />}
                </div>
              )}
            </div>
          )}
        </For>
      </div>

      {/* Bottom controls */}
      <div class="border-t border-gray-700 px-3 py-2">
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
          <span class="text-[10px] text-gray-400">自动计算</span>
        </label>
      </div>
    </div>
  );
};

export default AccordionPanel;

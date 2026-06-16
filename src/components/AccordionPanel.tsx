import { Component, createSignal, For, createEffect } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType, FlywheelTypeNames } from "../types";
import GeometryTab from "./tabs/GeometryTab";
import MaterialTab from "./tabs/MaterialTab";
import OperatingTab from "./tabs/OperatingTab";
import PresetSelector from "./PresetSelector";
import { runSimulationWithState } from "../services/api";

type SectionId = "geometry" | "material" | "operating" | "presets";

const SECTIONS: { id: SectionId; title: string }[] = [
  { id: "geometry", title: "几何尺寸" },
  { id: "material", title: "材料选择" },
  { id: "operating", title: "工况参数" },
  { id: "presets", title: "预设方案" },
];

const AccordionPanel: Component = () => {
  const [openSections, setOpenSections] = createSignal<Set<SectionId>>(new Set(["geometry"]));
  const ctx = useAppContext();

  // Auto compute on param change (debounced)
  let debounceTimer: ReturnType<typeof setTimeout>;
  createEffect(() => {
    const params = ctx.state().params;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      runSimulationWithState(params, ctx.setLoading, ctx.setError, ctx.setSimulation);
    }, 300);
  });

  const toggle = (id: SectionId) => {
    const current = new Set(openSections());
    if (current.has(id)) current.delete(id);
    else current.add(id);
    setOpenSections(current);
  };

  return (
    <div class="flex flex-col h-full">
      {/* Flywheel type */}
      <div class="px-3 py-2 border-b border-gray-700">
        <label class="text-[10px] text-gray-500 block mb-1">飞轮类型</label>
        <select
          value={ctx.state().params.flywheel_type}
          onChange={(e) => ctx.setParams({ flywheel_type: parseInt(e.target.value) as FlywheelType })}
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
              <button
                onClick={() => toggle(section.id)}
                class="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors"
              >
                <span>{section.title}</span>
                <svg
                  class={`w-3 h-3 transition-transform ${openSections().has(section.id) ? "rotate-90" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {openSections().has(section.id) && (
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
    </div>
  );
};

export default AccordionPanel;

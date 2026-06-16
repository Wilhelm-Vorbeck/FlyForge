import { Component, For } from "solid-js";
import { useAppContext } from "../store";
import { PRESETS, Preset } from "../presets";

const PresetSelector: Component = () => {
  const ctx = useAppContext();

  const loadPreset = (preset: Preset) => ctx.setParams(preset.params);

  return (
    <div class="space-y-2">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">预设方案</h3>
      <div class="space-y-1.5 max-h-[calc(100vh-300px)] overflow-auto">
        <For each={PRESETS}>
          {(preset) => {
            const active = JSON.stringify(preset.params) === JSON.stringify(ctx.state().params);
            return (
              <button
                onClick={() => loadPreset(preset)}
                class={`w-full text-left px-3 py-2 rounded transition-colors ${
                  active ? "bg-blue-900/40 border border-blue-700/60" : "bg-gray-700/50 hover:bg-gray-700 border border-transparent"
                }`}
              >
                <div class="flex items-center justify-between">
                  <p class="text-xs font-medium text-white truncate">{preset.name_zh}</p>
                  {active && <span class="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded flex-shrink-0 ml-2">当前</span>}
                </div>
                <p class="text-[10px] text-gray-500 mt-0.5 truncate">{preset.description}</p>
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
};

export default PresetSelector;

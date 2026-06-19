import { Component, For, createSignal, Show } from "solid-js";
import { useAppContext } from "../../store";
import { LayerConfig } from "../../types";

const DEFAULT_MATERIALS = [
  { id: "aisi_4340", name_zh: "AISI 4340" },
  { id: "carbon_fiber_t700", name_zh: "T700 碳纤维" },
  { id: "carbon_fiber_t1000", name_zh: "T1000 碳纤维" },
  { id: "aluminum_7075", name_zh: "7075-T6 铝" },
  { id: "titanium_ti6al4v", name_zh: "Ti-6Al-4V" },
  { id: "maraging_18ni", name_zh: "18Ni 时效钢" },
];

const LayerEditor: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const layers = () => p().layer_configs || [];
  const [expanded, setExpanded] = createSignal(false);
  const [newThickness, setNewThickness] = createSignal(30);
  const [newRadius, setNewRadius] = createSignal(100);
  const [newMaterial, setNewMaterial] = createSignal("carbon_fiber_t700");

  const addLayer = () => {
    const current = [...layers()];
    const lastRadius = current.length > 0 ? current[current.length - 1].outer_radius : p().r_i;
    const outerR = newRadius() > lastRadius ? newRadius() : lastRadius + 20;
    current.push({
      material_id: newMaterial(),
      thickness: newThickness(),
      outer_radius: Math.min(outerR, p().r_o),
    });
    ctx.setParams({ layer_configs: current });
  };

  const removeLayer = (index: number) => {
    const current = [...layers()];
    current.splice(index, 1);
    ctx.setParams({ layer_configs: current });
  };

  const updateLayer = (index: number, update: Partial<LayerConfig>) => {
    const current = [...layers()];
    current[index] = { ...current[index], ...update };
    ctx.setParams({ layer_configs: current });
  };

  const getMaterialName = (id: string) =>
    DEFAULT_MATERIALS.find((m) => m.id === id)?.name_zh || id;

  return (
    <div class="space-y-2">
      <button onClick={() => setExpanded(!expanded())}
        class="w-full text-[10px] py-1 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] transition-colors">
        {expanded() ? "收起图层编辑" : `图层编辑 (${layers().length}层)`}
      </button>

      <Show when={expanded()}>
        <div class="bg-[#0d1419] border border-[#1a2e22] rounded p-2 space-y-2">
          {/* Existing layers */}
          <For each={layers()}>
            {(layer, i) => (
              <div class="flex items-center gap-1 text-[10px]">
                <span class="text-gray-500 w-4">{i() + 1}.</span>
                <span class="text-gray-300 flex-1 truncate">{getMaterialName(layer.material_id)}</span>
                <span class="text-gray-500">t={layer.thickness}</span>
                <span class="text-gray-500">→{layer.outer_radius}mm</span>
                <button onClick={() => removeLayer(i())}
                  class="text-red-400 hover:text-red-300 px-1">✕</button>
              </div>
            )}
          </For>

          {/* Add new layer form */}
          <div class="border-t border-[#1a2e22] pt-2">
            <p class="text-[9px] text-gray-500 mb-1">添加新层</p>
            <div class="grid grid-cols-3 gap-1">
              <div>
                <label class="text-[8px] text-gray-600 block">材料</label>
                <select value={newMaterial()} onChange={(e) => setNewMaterial(e.currentTarget.value)}
                  class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-1 py-0.5 text-[10px] text-white">
                  <For each={DEFAULT_MATERIALS}>
                    {(m) => <option value={m.id}>{m.name_zh}</option>}
                  </For>
                </select>
              </div>
              <div>
                <label class="text-[8px] text-gray-600 block">厚度 mm</label>
                <input type="number" value={newThickness()} onInput={(e) => setNewThickness(parseFloat(e.currentTarget.value) || 10)}
                  class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-1 py-0.5 text-[10px] text-white" />
              </div>
              <div>
                <label class="text-[8px] text-gray-600 block">外径 mm</label>
                <input type="number" value={newRadius()} onInput={(e) => setNewRadius(parseFloat(e.currentTarget.value) || 50)}
                  class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-1 py-0.5 text-[10px] text-white" />
              </div>
            </div>
            <button onClick={addLayer}
              class="w-full text-[9px] py-1 mt-2 rounded bg-emerald-700 text-white hover:bg-emerald-600 transition-colors">
              + 添加层
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
};

export default LayerEditor;

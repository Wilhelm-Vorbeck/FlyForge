import { Component, For } from "solid-js";
import { useAppContext } from "../../store";

const MATERIALS = [
  { id: "aisi_4340", name_zh: "AISI 4340 合金钢", density: 7850, yield_strength: 860 },
  { id: "aluminum_7075", name_zh: "7075-T6 铝合金", density: 2810, yield_strength: 503 },
  { id: "titanium_ti6al4v", name_zh: "Ti-6Al-4V 钛合金", density: 4430, yield_strength: 880 },
  { id: "carbon_fiber_t700", name_zh: "T700 碳纤维/环氧树脂", density: 1800, yield_strength: 4900 },
  { id: "q235_steel", name_zh: "Q235 碳素结构钢", density: 7850, yield_strength: 235 },
  { id: "c45_steel", name_zh: "C45 碳素结构钢", density: 7850, yield_strength: 355 },
  { id: "aisi_4140", name_zh: "42CrMo 合金结构钢", density: 7850, yield_strength: 785 },
  { id: "maraging_18ni", name_zh: "18Ni 马氏体时效钢", density: 8000, yield_strength: 1900 },
  { id: "aluminum_6061", name_zh: "6061-T6 铝合金", density: 2700, yield_strength: 276 },
  { id: "ductile_iron_qt600", name_zh: "QT600-3 球墨铸铁", density: 7100, yield_strength: 370 },
  { id: "gray_iron_ht250", name_zh: "HT250 灰铸铁", density: 7200, yield_strength: 165 },
  { id: "carbon_fiber_t1000", name_zh: "T1000 碳纤维/环氧树脂", density: 1800, yield_strength: 6370 },
];

const MaterialTab: Component = () => {
  const ctx = useAppContext();

  const current = () =>
    MATERIALS.find((m) => m.id === ctx.state().params.material_id) || MATERIALS[0];

  return (
    <div class="space-y-2.5">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">材料</h3>

      {/* Material selector */}
      <select
        value={ctx.state().params.material_id}
        onChange={(e) => ctx.setParams({ material_id: e.target.value })}
        class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <For each={MATERIALS}>
          {(m) => <option value={m.id}>{m.name_zh}</option>}
        </For>
      </select>

      {/* Compact properties */}
      <div class="grid grid-cols-3 gap-2 text-center">
        <div class="bg-[#111a22]/60 rounded px-2 py-1.5 border border-[#1a2e22]">
          <p class="text-[10px] text-gray-500">密度</p>
          <p class="text-xs text-white font-mono">{current().density}</p>
          <p class="text-[10px] text-gray-500">kg/m³</p>
        </div>
        <div class="bg-[#111a22]/60 rounded px-2 py-1.5 border border-[#1a2e22]">
          <p class="text-[10px] text-gray-500">屈服强度</p>
          <p class="text-xs text-white font-mono">{current().yield_strength}</p>
          <p class="text-[10px] text-gray-500">MPa</p>
        </div>
        <div class="bg-[#111a22]/60 rounded px-2 py-1.5 border border-[#1a2e22]">
          <p class="text-[10px] text-gray-500">比强度</p>
          <p class="text-xs text-white font-mono">{(current().yield_strength / current().density * 1000).toFixed(0)}</p>
          <p class="text-[10px] text-gray-500">kN·m/kg</p>
        </div>
      </div>

      {/* Strength bar comparison */}
      <div class="space-y-1">
        <For each={MATERIALS.slice(0, 8)}>
          {(m) => (
            <div class="flex items-center">
              <span class="text-[10px] text-gray-500 w-14 truncate">{m.name_zh.slice(0, 5)}</span>
              <div class="flex-1 mx-1 h-1.5 bg-[#1a2e22] rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min((m.yield_strength / 6500) * 100, 100)}%`,
                    background: m.id === ctx.state().params.material_id ? "#3B82F6" : "#4B5563",
                  }}
                />
              </div>
              <span class="text-[10px] text-gray-400 w-10 text-right">{m.yield_strength}</span>
            </div>
          )}
        </For>
      </div>
    </div>
  );
};

export default MaterialTab;

import { Component, For } from "solid-js";
import { useAppContext } from "../../store";

// Material data (should match Rust backend)
const MATERIALS = [
  { id: "aisi_4340", name: "AISI 4340 Steel", name_zh: "AISI 4340 合金钢", density: 7850, yield_strength: 860 },
  { id: "aluminum_7075", name: "Aluminum 7075-T6", name_zh: "7075-T6 铝合金", density: 2810, yield_strength: 503 },
  { id: "titanium_ti6al4v", name: "Titanium Ti-6Al-4V", name_zh: "Ti-6Al-4V 钛合金", density: 4430, yield_strength: 880 },
  { id: "carbon_fiber_t700", name: "Carbon Fiber T700/Epoxy", name_zh: "T700 碳纤维/环氧树脂", density: 1800, yield_strength: 4900 },
  { id: "q235_steel", name: "Q235 Structural Steel", name_zh: "Q235 碳素结构钢", density: 7850, yield_strength: 235 },
  { id: "c45_steel", name: "C45 Carbon Steel", name_zh: "C45 碳素结构钢（45#）", density: 7850, yield_strength: 355 },
  { id: "aisi_4140", name: "AISI 4140 / 42CrMo", name_zh: "42CrMo 合金结构钢", density: 7850, yield_strength: 785 },
  { id: "maraging_18ni", name: "18Ni Maraging Steel", name_zh: "18Ni 马氏体时效钢", density: 8000, yield_strength: 1900 },
  { id: "aluminum_6061", name: "Aluminum 6061-T6", name_zh: "6061-T6 铝合金", density: 2700, yield_strength: 276 },
  { id: "ductile_iron_qt600", name: "Ductile Iron QT600-3", name_zh: "QT600-3 球墨铸铁", density: 7100, yield_strength: 370 },
  { id: "gray_iron_ht250", name: "Gray Cast Iron HT250", name_zh: "HT250 灰铸铁", density: 7200, yield_strength: 165 },
  { id: "carbon_fiber_t1000", name: "Carbon Fiber T1000/Epoxy", name_zh: "T1000 碳纤维/环氧树脂", density: 1800, yield_strength: 6370 },
];

const MaterialTab: Component = () => {
  const context = useAppContext();

  const currentMaterial = () =>
    MATERIALS.find((m) => m.id === context.state().params.material_id) || MATERIALS[0];

  const specificStrength = (ys: number, density: number) =>
    (ys / density * 1000).toFixed(1);

  return (
    <div>
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        材料选择
      </h3>

      {/* Material selector */}
      <div class="mb-6">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          预设材料
        </label>
        <select
          value={context.state().params.material_id}
          onChange={(e) => context.setParams({ material_id: e.target.value })}
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <For each={MATERIALS}>
            {(material) => (
              <option value={material.id}>
                {material.name_zh} ({material.name})
              </option>
            )}
          </For>
        </select>
      </div>

      {/* Material properties */}
      <div class="bg-gray-700 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-300 mb-3">材料属性</h4>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <span class="text-xs text-gray-400">密度</span>
            <p class="text-white font-mono">{currentMaterial().density} kg/m³</p>
          </div>
          <div>
            <span class="text-xs text-gray-400">屈服强度</span>
            <p class="text-white font-mono">{currentMaterial().yield_strength} MPa</p>
          </div>
          <div>
            <span class="text-xs text-gray-400">比强度</span>
            <p class="text-white font-mono">
              {specificStrength(currentMaterial().yield_strength, currentMaterial().density)} MPa·m³/kg
            </p>
          </div>
          <div>
            <span class="text-xs text-gray-400">适用性</span>
            <p class="text-green-400 font-mono">
              {currentMaterial().yield_strength > 500 ? "高性能" : "标准"}
            </p>
          </div>
        </div>
      </div>

      {/* Material comparison chart */}
      <div class="mt-6 bg-gray-700 rounded-lg p-4">
        <h4 class="text-sm font-medium text-gray-300 mb-3">材料性能对比</h4>
        <div class="space-y-2">
          <For each={MATERIALS.slice(0, 6)}>
            {(material) => (
              <div class="flex items-center">
                <span class="text-xs text-gray-400 w-20 truncate">{material.name_zh.slice(0, 6)}</span>
                <div class="flex-1 mx-2 h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    class="h-full rounded-full"
                    style={{
                      width: `${(material.yield_strength / 2000) * 100}%`,
                      background: material.id === context.state().params.material_id
                        ? "#3B82F6"
                        : "#4B5563",
                    }}
                  />
                </div>
                <span class="text-xs text-gray-300 w-16 text-right">{material.yield_strength} MPa</span>
              </div>
            )}
          </For>
        </div>
      </div>
    </div>
  );
};

export default MaterialTab;

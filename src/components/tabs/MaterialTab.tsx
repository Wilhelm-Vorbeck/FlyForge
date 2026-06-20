import { Component, For, createSignal, Show } from "solid-js";
import { useAppContext } from "../../store";
import { persistCustomMaterials, CustomMaterial } from "../../utils/persist";

const BUILTIN_MATERIALS = [
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
  const [showAdd, setShowAdd] = createSignal(false);
  const [customMaterials, setCustomMaterials] = createSignal<CustomMaterial[]>(persistCustomMaterials.getAll());

  // New material form state
  const [newName, setNewName] = createSignal("");
  const [newDensity, setNewDensity] = createSignal(7850);
  const [newYield, setNewYield] = createSignal(400);
  const [newTensile, setNewTensile] = createSignal(600);
  const [newFatigue, setNewFatigue] = createSignal(300);
  const [newYoung, setNewYoung] = createSignal(200);
  const [newPoisson, setNewPoisson] = createSignal(0.3);
  const [newCTE, setNewCTE] = createSignal(12);

  // Combined material list
  const allMaterials = () => [
    ...BUILTIN_MATERIALS,
    ...customMaterials().map((m) => ({
      id: m.id, name_zh: m.name_zh, density: m.density, yield_strength: m.yield_strength,
    })),
  ];

  const current = () =>
    allMaterials().find((m) => m.id === ctx.state().params.material_id) || allMaterials()[0];

  const handleAdd = () => {
    const name = newName().trim();
    if (!name) return;
    const id = `custom_${Date.now()}`;
    const m: CustomMaterial = {
      id, name_zh: name,
      density: newDensity(), yield_strength: newYield(),
      tensile_strength: newTensile(), fatigue_limit: newFatigue(),
      young_modulus: newYoung(), poisson_ratio: newPoisson(),
      thermal_expansion: newCTE(),
    };
    persistCustomMaterials.add(m);
    setCustomMaterials(persistCustomMaterials.getAll());
    ctx.setParams({ material_id: id, material_override: toMaterialObj(m) });
    setShowAdd(false);
    setNewName("");
  };

  /** Convert CustomMaterial to full Material for backend */
  const toMaterialObj = (m: CustomMaterial) => ({
    name: m.id, name_zh: m.name_zh,
    density: m.density, young_modulus: m.young_modulus,
    poisson_ratio: m.poisson_ratio, yield_strength: m.yield_strength,
    tensile_strength: m.tensile_strength, fatigue_limit: m.fatigue_limit,
    specific_strength: m.yield_strength / m.density * 1000,
    thermal_expansion: m.thermal_expansion, reference_temperature: 20,
  });

  const handleRemove = (id: string) => {
    persistCustomMaterials.remove(id);
    setCustomMaterials(persistCustomMaterials.getAll());
    // Switch to default if removed material was selected
    if (ctx.state().params.material_id === id) {
      ctx.setParams({ material_id: "aisi_4340" });
    }
  };

  return (
    <div class="space-y-2.5">
      <h3 class="text-xs font-semibold text-gray-400 uppercase tracking-wider">材料</h3>

      {/* Material selector */}
      <select
        value={ctx.state().params.material_id}
        onChange={(e) => {
          const id = e.target.value;
          const custom = customMaterials().find(m => m.id === id);
          ctx.setParams({
            material_id: id,
            material_override: custom ? toMaterialObj(custom) : undefined,
          });
        }}
        class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
      >
        <optgroup label="内置材料">
          <For each={BUILTIN_MATERIALS}>
            {(m) => <option value={m.id}>{m.name_zh}</option>}
          </For>
        </optgroup>
        <Show when={customMaterials().length > 0}>
          <optgroup label="自定义材料">
            <For each={customMaterials()}>
              {(m) => <option value={m.id}>{m.name_zh}</option>}
            </For>
          </optgroup>
        </Show>
      </select>

      {/* Add / Remove custom material buttons */}
      <div class="flex gap-1">
        <button onClick={() => setShowAdd(!showAdd())}
          class="flex-1 text-[10px] py-1 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] transition-colors">
          {showAdd() ? "取消" : "+ 自定义材料"}
        </button>
        <Show when={customMaterials().some((m) => m.id === ctx.state().params.material_id)}>
          <button onClick={() => handleRemove(ctx.state().params.material_id)}
            class="text-[10px] px-2 py-1 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors">
            删除
          </button>
        </Show>
      </div>

      {/* Add custom material form */}
      <Show when={showAdd()}>
        <div class="bg-[#0d1419] border border-[#1a2e22] rounded p-2 space-y-2">
          <div>
            <label class="text-[10px] text-gray-500 block mb-0.5">材料名称</label>
            <input type="text" value={newName()} onInput={(e) => setNewName(e.currentTarget.value)}
              placeholder="如：自定义合金钢"
              class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">密度 (kg/m³)</label>
              <input type="number" value={newDensity()} onInput={(e) => setNewDensity(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">杨氏模量 (GPa)</label>
              <input type="number" step="0.1" value={newYoung()} onInput={(e) => setNewYoung(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">泊松比</label>
              <input type="number" step="0.01" value={newPoisson()} onInput={(e) => setNewPoisson(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">屈服强度 (MPa)</label>
              <input type="number" value={newYield()} onInput={(e) => setNewYield(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">抗拉强度 (MPa)</label>
              <input type="number" value={newTensile()} onInput={(e) => setNewTensile(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">疲劳极限 (MPa)</label>
              <input type="number" value={newFatigue()} onInput={(e) => setNewFatigue(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
            <div>
              <label class="text-[10px] text-gray-500 block mb-0.5">热膨胀系数 (10⁻⁶/K)</label>
              <input type="number" step="0.1" value={newCTE()} onInput={(e) => setNewCTE(parseFloat(e.currentTarget.value) || 0)}
                class="w-full bg-[#111a22] border border-[#1a2e22] rounded px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
            </div>
          </div>
          <button onClick={handleAdd} disabled={!newName().trim()}
            class="w-full text-[10px] py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors">
            保存
          </button>
        </div>
      </Show>

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
        <For each={allMaterials().slice(0, 12)}>
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

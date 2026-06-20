/**
 * ComparePanel — scheme list management + comparison table + radar chart.
 * Appears in the right sidebar or as a modal overlay.
 */
import { Component, Show, For, createSignal, Switch, Match } from "solid-js";
import { useSchemeContext } from "../store/schemes";
import { useAppContext } from "../store";
import { SavedScheme } from "../utils/schemes";
import { FlywheelTypeNames, FlywheelType } from "../types";
import RadarChart from "./RadarChart";

const COLORS = ["#3B82F6", "#EF4444", "#F59E0B", "#10B981"];

/** Format number with optional precision */
const fmt = (v: number | undefined, decimals = 1) =>
  v != null && isFinite(v) ? v.toFixed(decimals) : "—";

/** Comparison metrics for radar chart */
const RADAR_AXES = ["比能量", "安全系数", "储能", "质量(逆)", "惯量(逆)", "应力(逆)"];

function toRadarSeries(scheme: SavedScheme, allSchemes: SavedScheme[]): { name: string; color: string; data: { label: string; value: number }[] } | null {
  const s = scheme.summary;
  if (!s) return null;
  const idx = allSchemes.indexOf(scheme);
  const color = COLORS[idx % COLORS.length];

  // Collect all values for normalization
  const allSE = allSchemes.map(x => x.summary?.specific_energy ?? 0);
  const allSF = allSchemes.map(x => x.summary?.safety_yield ?? 0);
  const allE = allSchemes.map(x => x.summary?.energy_usable ?? 0);
  const allM = allSchemes.map(x => x.summary?.mass ?? 0);
  const allI = allSchemes.map(x => x.summary?.moment_of_inertia ?? 0);
  const allSt = allSchemes.map(x => x.summary?.max_stress ?? 0);

  const norm = (v: number, arr: number[], invert = false) => {
    const max = Math.max(...arr, 0.001);
    const n = v / max;
    return invert ? Math.max(0, 1 - n + 0.05) : n;
  };

  return {
    name: scheme.name,
    color,
    data: [
      { label: "比能量", value: norm(s.specific_energy, allSE) },
      { label: "安全系数", value: norm(s.safety_yield, allSF) },
      { label: "储能", value: norm(s.energy_usable, allE) },
      { label: "质量(逆)", value: norm(s.mass, allM, true) },
      { label: "惯量(逆)", value: norm(s.moment_of_inertia, allI, true) },
      { label: "应力(逆)", value: norm(s.max_stress, allSt, true) },
    ],
  };
}

const ComparePanel: Component = () => {
  const sc = useSchemeContext();
  const ctx = useAppContext();
  const [saveName, setSaveName] = createSignal("");
  const [renamingId, setRenamingId] = createSignal<string | null>(null);
  const [renameValue, setRenameValue] = createSignal("");
  const [tab, setTab] = createSignal<"list" | "compare">("list");

  const handleSave = () => {
    const name = saveName().trim() || `方案 ${sc.schemes().length + 1}`;
    const sim = ctx.state().simulation;
    sc.saveCurrent(name, ctx.state().params, sim?.material ?? { name: "", name_zh: "", density: 0, young_modulus: 0, poisson_ratio: 0, yield_strength: 0, tensile_strength: 0, fatigue_limit: 0, specific_strength: 0, thermal_expansion: 0, reference_temperature: 0 }, sim);
    setSaveName("");
  };

  const handleRename = (id: string) => {
    const v = renameValue().trim();
    if (v) sc.rename(id, v);
    setRenamingId(null);
    setRenameValue("");
  };

  const selected = () => sc.selectedSchemes();
  const radarSeries = () => selected().map(s => toRadarSeries(s, selected())).filter(Boolean) as NonNullable<ReturnType<typeof toRadarSeries>>[];

  return (
    <div class="space-y-3">
      {/* Header */}
      <div class="flex items-center justify-between">
        <h3 class="text-xs font-semibold text-gray-400">方案对比</h3>
        <div class="flex space-x-1">
          <button onClick={() => setTab("list")}
            class={`px-2 py-0.5 text-[10px] rounded ${tab() === "list" ? "bg-emerald-900/40 text-emerald-300" : "text-gray-500 hover:text-gray-400"}`}>
            列表
          </button>
          <button onClick={() => setTab("compare")}
            class={`px-2 py-0.5 text-[10px] rounded ${tab() === "compare" ? "bg-emerald-900/40 text-emerald-300" : "text-gray-500 hover:text-gray-400"}`}>
            对比
          </button>
        </div>
      </div>

      {/* Save current scheme */}
      <div class="flex space-x-1">
        <input
          type="text"
          placeholder="方案名称..."
          value={saveName()}
          onInput={(e) => setSaveName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          class="flex-1 bg-[#0d161a] border border-[#1a2e22] rounded px-2 py-1 text-[10px] text-white placeholder-gray-600 focus:border-emerald-700 focus:outline-none"
        />
        <button onClick={handleSave}
          class="px-2 py-1 bg-emerald-800/40 hover:bg-emerald-700/40 text-emerald-300 text-[10px] rounded border border-emerald-800/40">
          保存
        </button>
      </div>

      {/* Tab content */}
      <Switch>
        <Match when={tab() === "list"}>
          {/* Scheme list */}
          <div class="space-y-1 max-h-[300px] overflow-y-auto">
            <Show when={sc.schemes().length === 0}>
              <p class="text-[10px] text-gray-600 text-center py-3">暂无已保存方案</p>
            </Show>
            <For each={sc.schemes()}>
              {(scheme) => (
                <div class={`flex items-center space-x-1.5 px-2 py-1.5 rounded border transition-colors cursor-pointer ${
                  sc.isSelected(scheme.id)
                    ? "bg-emerald-900/20 border-emerald-700/40"
                    : "bg-[#111a22]/40 border-[#1a2e22] hover:border-[#2a3e32]"
                }`} onClick={() => sc.toggleSelect(scheme.id)}>
                  {/* Checkbox */}
                  <div class={`w-3 h-3 rounded-sm border flex-shrink-0 flex items-center justify-center ${
                    sc.isSelected(scheme.id) ? "bg-emerald-600 border-emerald-500" : "border-gray-600"
                  }`}>
                    <Show when={sc.isSelected(scheme.id)}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" stroke-width="1.5"/></svg>
                    </Show>
                  </div>

                  {/* Name */}
                  <Show when={renamingId() !== scheme.id} fallback={
                    <input type="text" value={renameValue()} onInput={(e) => setRenameValue(e.currentTarget.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleRename(scheme.id); if (e.key === "Escape") setRenamingId(null); }}
                      onBlur={() => handleRename(scheme.id)}
                      class="flex-1 bg-[#0d161a] border border-emerald-700 rounded px-1 py-0.5 text-[10px] text-white" autofocus />
                  }>
                    <div class="flex-1 min-w-0">
                      <p class="text-[10px] text-white truncate">{scheme.name}</p>
                      <p class="text-[8px] text-gray-600 truncate">
                        {FlywheelTypeNames[scheme.params.flywheel_type as FlywheelType]?.zh ?? "?"} · {scheme.material.name_zh}
                        {scheme.summary ? ` · ${fmt(scheme.summary.mass)}kg` : ""}
                      </p>
                    </div>
                  </Show>

                  {/* Actions */}
                  <Show when={renamingId() !== scheme.id}>
                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(scheme.id); setRenameValue(scheme.name); }}
                      class="text-gray-600 hover:text-gray-400 p-0.5" title="重命名">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5L7 1Z" stroke="currentColor" stroke-width="0.8"/></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); sc.remove(scheme.id); }}
                      class="text-gray-600 hover:text-red-400 p-0.5" title="删除">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 3H8L7.5 9H2.5L2 3ZM1 2H9M4 1H6" stroke="currentColor" stroke-width="0.8"/></svg>
                    </button>
                  </Show>
                </div>
              )}
            </For>
          </div>

          {/* Clear all */}
          <Show when={sc.schemes().length > 0}>
            <div class="flex justify-between items-center pt-1">
              <span class="text-[9px] text-gray-600">{sc.selectedIds().length}/4 已选</span>
              <button onClick={sc.clearAll} class="text-[9px] text-red-500/60 hover:text-red-400">清空全部</button>
            </div>
          </Show>
        </Match>

        <Match when={tab() === "compare"}>
          <Show when={selected().length < 2}
            fallback={
              <div class="space-y-3">
                {/* Comparison table */}
                <div class="overflow-x-auto">
                  <table class="w-full text-[9px]">
                    <thead>
                      <tr class="border-b border-[#1a2e22]">
                        <th class="text-left text-gray-500 py-1 pr-2 font-normal">指标</th>
                        <For each={selected()}>
                          {(s, i) => <th class="text-right py-1 px-1 font-normal" style={{ color: COLORS[i() % COLORS.length] }}>{s.name}</th>}
                        </For>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "飞轮类型", get: (s: SavedScheme) => FlywheelTypeNames[s.params.flywheel_type as FlywheelType]?.zh ?? "?" },
                        { label: "材料", get: (s: SavedScheme) => s.material.name_zh },
                        { label: "外径", get: (s: SavedScheme) => fmt(s.params.r_o) + " mm" },
                        { label: "内径", get: (s: SavedScheme) => fmt(s.params.r_i) + " mm" },
                        { label: "质量", get: (s: SavedScheme) => fmt(s.summary?.mass) + " kg" },
                        { label: "转动惯量", get: (s: SavedScheme) => fmt(s.summary?.moment_of_inertia, 4) + " kg·m²" },
                        { label: "最大应力", get: (s: SavedScheme) => fmt(s.summary?.max_stress) + " MPa" },
                        { label: "屈服安全系数", get: (s: SavedScheme) => fmt(s.summary?.safety_yield, 2) },
                        { label: "疲劳安全系数", get: (s: SavedScheme) => fmt(s.summary?.safety_fatigue, 2) },
                        { label: "可用储能", get: (s: SavedScheme) => fmt(s.summary?.energy_usable) + " kJ" },
                        { label: "比能量", get: (s: SavedScheme) => fmt(s.summary?.specific_energy, 2) + " Wh/kg" },
                        { label: "安全评估", get: (s: SavedScheme) => s.summary?.safety_passed ? "✓ 通过" : "✗ 未通过" },
                      ].map(row => (
                        <tr class="border-b border-[#1a2e22]/50">
                          <td class="text-gray-500 py-1 pr-2">{row.label}</td>
                          <For each={selected()}>
                            {(s, i) => {
                              const val = row.get(s);
                              const isWarn = val.includes("✗");
                              return <td class={`text-right py-1 px-1 ${isWarn ? "text-red-400" : "text-gray-300"}`}>{val}</td>;
                            }}
                          </For>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Radar chart */}
                <Show when={radarSeries().length >= 2}>
                  <div>
                    <p class="text-[10px] text-gray-500 mb-1">雷达对比图</p>
                    <RadarChart axes={RADAR_AXES} series={radarSeries()} size={260} />
                    {/* Legend */}
                    <div class="flex flex-wrap gap-2 mt-1 justify-center">
                      <For each={selected()}>
                        {(s, i) => (
                          <span class="text-[8px] flex items-center gap-1">
                            <span class="w-2 h-2 rounded-full inline-block" style={{ "background-color": COLORS[i() % COLORS.length] }} />
                            {s.name}
                          </span>
                        )}
                      </For>
                    </div>
                  </div>
                </Show>
              </div>
            }>
            <div class="text-center py-6">
              <p class="text-[10px] text-gray-500">请在列表中选择至少 2 个方案</p>
              <p class="text-[9px] text-gray-600 mt-1">（最多 4 个）</p>
            </div>
          </Show>
        </Match>
      </Switch>
    </div>
  );
};

export default ComparePanel;

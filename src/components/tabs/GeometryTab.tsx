import { Component, Show } from "solid-js";
import { useAppContext } from "../../store";
import { FlywheelType } from "../../types";
import NumberInput from "../NumberInput";

/** Get field labels based on flywheel type */
function getLabels(ft: FlywheelType) {
  switch (ft) {
    case FlywheelType.SolidDisk:
      return { ro: "外径 Ro", ri: null, thickness: "轮缘厚", hub: "轮毂径", hubThick: "轮毂厚", hint: "实心圆盘 — 无中心孔" };
    case FlywheelType.AnnularRing:
      return { ro: "外径 Ro", ri: "内径 Ri", thickness: "轮缘厚", hub: "轮毂径", hubThick: "轮毂厚", hint: "环形等厚轮 — 最常用的飞轮结构" };
    case FlywheelType.TaperedDisk:
      return { ro: "外径 Ro", ri: "内径 Ri", thickness: "边缘厚度(外径)", hub: "轮毂径", hubThick: "根厚(内径)", hint: "锥形盘 — 厚度从内到外线性递减" };
    case FlywheelType.ConstantStrength:
      return { ro: "外径 Ro", ri: "内径 Ri", thickness: "中心最大厚", hub: null, hubThick: null, hint: "等强度轮 — 厚度与半径成反比 t(r) = t₀×Ri/r" };
    case FlywheelType.MultiLayerComposite:
      return { ro: "外径 Ro", ri: "内径 Ri", thickness: null, hub: null, hubThick: null, hint: "多层复合轮 — 在材料面板中配置各层" };
  }
}

/** Hide Ri input for types without bore */
function showRi(ft: FlywheelType) {
  return ft !== FlywheelType.SolidDisk;
}

const GeometryTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const ft = () => p().flywheel_type;
  const hasError = () => !!ctx.state().error;
  const labels = () => getLabels(ft());

  return (
    <div class="space-y-2">
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">几何尺寸</h3>

      {/* Inline error banner */}
      <Show when={hasError()}>
        <div class="bg-red-900/20 border border-red-800/40 rounded px-2 py-1.5 mb-1">
          <p class="text-[10px] text-red-400 truncate" title={ctx.state().error!}>⚠ {ctx.state().error}</p>
        </div>
      </Show>

      <div class="space-y-1.5">
        <NumberInput label={labels().ro} value={p().r_o} onChange={(v) => ctx.setParams({ r_o: v })} unit="mm" min={10} max={1000} step={1} error={hasError()} />
        <Show when={showRi(ft())}>
          <NumberInput label={labels().ri!} value={p().r_i} onChange={(v) => ctx.setParams({ r_i: v })} unit="mm" min={0} max={500} step={1} error={hasError()} />
        </Show>
        <Show when={labels().thickness !== null}>
          <NumberInput label={labels().thickness!} value={p().thickness} onChange={(v) => ctx.setParams({ thickness: v })} unit="mm" min={1} max={200} step={1} error={hasError()} />
        </Show>
        <Show when={labels().hub !== null}>
          <NumberInput label={labels().hub!} value={p().r_hub} onChange={(v) => ctx.setParams({ r_hub: v })} unit="mm" min={0} max={500} step={1} error={hasError()} />
        </Show>
        <Show when={labels().hubThick !== null}>
          <NumberInput label={labels().hubThick!} value={p().hub_thickness} onChange={(v) => ctx.setParams({ hub_thickness: v })} unit="mm" min={1} max={200} step={1} error={hasError()} />
        </Show>
      </div>

      {/* Type hint */}
      <div class="bg-[#0d1419]/60 border border-[#1a2e22] rounded px-2 py-1.5">
        <p class="text-[9px] text-gray-400 leading-relaxed">{labels().hint}</p>
      </div>
    </div>
  );
};

export default GeometryTab;

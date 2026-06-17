import { Component } from "solid-js";
import { useAppContext } from "../../store";
import NumberInput from "../NumberInput";

const GeometryTab: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  return (
    <div class="space-y-2">
      <h3 class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">几何尺寸</h3>
      <div class="space-y-1.5">
        <NumberInput label="外径 Ro" value={p().r_o} onChange={(v) => ctx.setParams({ r_o: v })} unit="mm" min={10} max={1000} step={1} />
        <NumberInput label="内径 Ri" value={p().r_i} onChange={(v) => ctx.setParams({ r_i: v })} unit="mm" min={0} max={500} step={1} />
        <NumberInput label="轮缘厚" value={p().thickness} onChange={(v) => ctx.setParams({ thickness: v })} unit="mm" min={1} max={200} step={1} />
        <NumberInput label="轮毂径" value={p().r_hub} onChange={(v) => ctx.setParams({ r_hub: v })} unit="mm" min={0} max={500} step={1} />
        <NumberInput label="轮毂厚" value={p().hub_thickness} onChange={(v) => ctx.setParams({ hub_thickness: v })} unit="mm" min={1} max={200} step={1} />
      </div>
    </div>
  );
};

export default GeometryTab;

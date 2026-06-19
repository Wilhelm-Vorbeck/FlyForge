import { Component, createSignal, Show } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType } from "../types";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const ft = () => p().flywheel_type;

  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  let lastX = 0, lastY = 0;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.2, Math.min(5, z * delta)));
  };

  const onMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setDragging(true);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging()) return;
    setPanX(px => px + (e.clientX - lastX));
    setPanY(py => py + (e.clientY - lastY));
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onMouseUp = () => setDragging(false);

  const maxR = () => Math.max(p().r_o, 1);
  const rScale = () => Math.min(120 / maxR(), 2);

  const vb = () => {
    const s = 200 / zoom();
    const cx = -panX() / zoom();
    const cy = -panY() / zoom();
    return `${cx - s} ${cy - s} ${s * 2} ${s * 2}`;
  };

  return (
    <div class="w-full h-full select-none relative"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: dragging() ? "grabbing" : "grab" }}
    >
      <svg width="100%" height="100%" viewBox={vb()} class="bg-[#0a0f14] rounded">
        <defs>
          <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.5" />
          </pattern>
          <pattern id="largeGrid" width="100" height="100" patternUnits="userSpaceOnUse">
            <rect width="100" height="100" fill="url(#smallGrid)" />
            <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#334155" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#largeGrid)" />

        <line x1="-1000" y1="0" x2="1000" y2="0" stroke="#475569" stroke-width="0.8" />
        <line x1="0" y1="-1000" x2="0" y2="1000" stroke="#475569" stroke-width="0.8" />

        <circle cx="0" cy="0" r={maxR() * rScale()}
          fill={ft() === FlywheelType.SolidDisk ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)"}
          stroke="#3B82F6" stroke-width="2" />

        <Show when={p().r_i > 0 && ft() !== FlywheelType.SolidDisk}>
          <circle cx="0" cy="0" r={p().r_i * rScale()} fill="#0b1120" stroke="#10B981" stroke-width="1.5" />
        </Show>

        <Show when={p().r_hub > 0 && p().r_hub < p().r_o && ft() !== FlywheelType.ConstantStrength && ft() !== FlywheelType.MultiLayerComposite}>
          <circle cx="0" cy="0" r={p().r_hub * rScale()} fill="none" stroke="#8B5CF6" stroke-width="1" stroke-dasharray="4 4" />
        </Show>

        <circle cx="0" cy="0" r="3" fill="#9CA3AF" />

        <text x="5" y={-maxR() * rScale() - 8} fill="#3B82F6" font-size="11">Ro={p().r_o}</text>
        <Show when={p().r_i > 0 && ft() !== FlywheelType.SolidDisk}>
          <text x={p().r_i * rScale() + 8} y="4" fill="#10B981" font-size="11">Ri={p().r_i}</text>
        </Show>
        <Show when={p().r_hub > 0 && p().r_hub < p().r_o && ft() !== FlywheelType.ConstantStrength && ft() !== FlywheelType.MultiLayerComposite}>
          <text x={p().r_hub * rScale() + 8} y="-8" fill="#8B5CF6" font-size="10">Hub={p().r_hub}</text>
        </Show>

        <text x="0" y="14" text-anchor="middle" fill="#64748B" font-size="10" opacity="0.7">
          {["实心圆盘","环形等厚轮","锥形盘","等强度轮","多层复合轮"][ft()]}
        </text>
      </svg>

      {/* Color legend */}
      <div class="absolute top-2 right-2 bg-[#0d1419]/90 border border-[#1a2e22] rounded px-2 py-1.5 space-y-1">
        <div class="flex items-center space-x-1.5">
          <div class="w-3 h-0.5 bg-blue-500 rounded" />
          <span class="text-[9px] text-gray-400">外径 Ro</span>
        </div>
        <Show when={p().r_i > 0 && ft() !== FlywheelType.SolidDisk}>
          <div class="flex items-center space-x-1.5">
            <div class="w-3 h-0.5 bg-green-500 rounded" />
            <span class="text-[9px] text-gray-400">内径 Ri</span>
          </div>
        </Show>
        <Show when={p().r_hub > 0 && p().r_hub < p().r_o && ft() !== FlywheelType.ConstantStrength && ft() !== FlywheelType.MultiLayerComposite}>
          <div class="flex items-center space-x-1.5">
            <div class="w-3 h-0.5 bg-purple-500 rounded border-dashed" style={{ "border-top": "1px dashed #8B5CF6", height: "0" }} />
            <span class="text-[9px] text-gray-400">轮毂 Hub</span>
          </div>
        </Show>
      </div>

      {/* Zoom */}
      <div class="absolute bottom-2 right-2 flex items-center space-x-1.5">
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
          class="text-[9px] px-2 py-0.5 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] hover:text-white transition-colors">⟲</button>
        <span class="text-[9px] text-gray-500 bg-[#0d1419]/80 px-1.5 py-0.5 rounded">
          {(zoom() * 100).toFixed(0)}% | 滚轮缩放·拖拽
        </span>
      </div>
    </div>
  );
};

export default SectionPreview;

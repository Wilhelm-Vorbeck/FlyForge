import { Component, createSignal } from "solid-js";
import { useAppContext } from "../store";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  // Zoom & pan state
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  let lastX = 0, lastY = 0;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
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

  // Grid pattern
  const gridSize = 20;

  return (
    <div class="w-full h-full select-none"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: dragging() ? "grabbing" : "grab" }}
    >
      <svg width="100%" height="100%" viewBox={vb()} class="bg-gray-900/80 rounded"
        style={{ "min-height": "180px" }}>
        <defs>
          <pattern id="smallGrid" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#1e293b" stroke-width="0.5" />
          </pattern>
          <pattern id="largeGrid" width={gridSize * 5} height={gridSize * 5} patternUnits="userSpaceOnUse">
            <rect width={gridSize * 5} height={gridSize * 5} fill="url(#smallGrid)" />
            <path d={`M ${gridSize * 5} 0 L 0 0 0 ${gridSize * 5}`} fill="none" stroke="#334155" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#largeGrid)" />

        {/* Axes */}
        <line x1="-1000" y1="0" x2="1000" y2="0" stroke="#475569" stroke-width="0.8" />
        <line x1="0" y1="-1000" x2="0" y2="1000" stroke="#475569" stroke-width="0.8" />

        {/* Outer */}
        <circle cx="0" cy="0" r={maxR() * rScale()} fill="rgba(59,130,246,0.08)" stroke="#3B82F6" stroke-width="2" />

        {/* Inner */}
        {p().r_i > 0 && (
          <circle cx="0" cy="0" r={p().r_i * rScale()} fill="#0b1120" stroke="#10B981" stroke-width="1.5" />
        )}

        {/* Hub */}
        {p().r_hub > 0 && p().r_hub < p().r_o && (
          <circle cx="0" cy="0" r={p().r_hub * rScale()} fill="none" stroke="#8B5CF6" stroke-width="1" stroke-dasharray="4 4" />
        )}

        {/* Center */}
        <circle cx="0" cy="0" r="3" fill="#9CA3AF" />

        {/* Labels */}
        <text x="5" y={-maxR() * rScale() - 8} fill="#3B82F6" font-size="11">Ro={p().r_o}</text>
        {p().r_i > 0 && (
          <text x={p().r_i * rScale() + 8} y="4" fill="#10B981" font-size="11">Ri={p().r_i}</text>
        )}
        {p().r_hub > 0 && p().r_hub < p().r_o && (
          <text x={p().r_hub * rScale() + 8} y="-8" fill="#8B5CF6" font-size="10">Hub={p().r_hub}</text>
        )}
      </svg>

      {/* Color legend */}
      <div class="absolute top-2 right-2 bg-gray-800/90 border border-gray-700 rounded px-2 py-1.5 space-y-1">
        <div class="flex items-center space-x-1.5">
          <div class="w-3 h-0.5 bg-blue-500 rounded" />
          <span class="text-[9px] text-gray-400">外径 Ro</span>
        </div>
        {p().r_i > 0 && (
          <div class="flex items-center space-x-1.5">
            <div class="w-3 h-0.5 bg-green-500 rounded" />
            <span class="text-[9px] text-gray-400">内径 Ri</span>
          </div>
        )}
        {p().r_hub > 0 && p().r_hub < p().r_o && (
          <div class="flex items-center space-x-1.5">
            <div class="w-3 h-0.5 bg-purple-500 rounded border-dashed" style={{ "border-top": "1px dashed #8B5CF6", height: "0" }} />
            <span class="text-[9px] text-gray-400">轮毂 Hub</span>
          </div>
        )}
      </div>

      {/* Zoom indicator */}
      <div class="absolute bottom-2 right-2 text-[9px] text-gray-500 bg-gray-800/80 px-1.5 py-0.5 rounded">
        {(zoom() * 100).toFixed(0)}% | 滚轮缩放·拖拽平移
      </div>
    </div>
  );
};

export default SectionPreview;

import { Component, createSignal, Show } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType } from "../types";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const ft = () => p().flywheel_type;

  // Zoom & pan state
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

  const gridSize = 20;

  // ── Cross-section view helpers ──
  const CS_H = 80; // cross-section height
  const CS_W = 240;
  const CS_PAD = 10;
  const plotW = CS_W - 2 * CS_PAD;

  const needsCrossSection = () =>
    ft() === FlywheelType.TaperedDisk ||
    ft() === FlywheelType.ConstantStrength ||
    ft() === FlywheelType.MultiLayerComposite;

  const cxToX = (r: number) => {
    const rMax = p().r_o;
    return CS_PAD + (r / Math.max(rMax, 1)) * plotW;
  };

  const thicknessToY = (t: number) => {
    const tMax = Math.max(p().thickness, p().hub_thickness, 1);
    return CS_H / 2 - (t / tMax) * (CS_H / 2 - 4);
  };

  // Generate cross-section path points
  const crossSectionPath = () => {
    const ro = p().r_o;
    const ri = p().r_i;
    const t = p().thickness;
    const th = p().hub_thickness;
    const n = 80;
    let points: { x: number; yTop: number; yBot: number }[] = [];

    switch (ft()) {
      case FlywheelType.TaperedDisk: {
        // Linear taper from thick at hub to thin at rim
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const frac = (r - ri) / (ro - ri || 1);
          const ht = th - (th - t) * frac;
          points.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      }
      case FlywheelType.ConstantStrength: {
        // t(r) = t_center * ri / r (hyperbolic)
        const t0 = t;
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const ht = t0 * (ri / r);
          points.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      }
      case FlywheelType.MultiLayerComposite: {
        // Stepped: hub -> web -> rim
        const rHub = p().r_hub;
        const rWeb = ro * 0.85;
        const tWeb = t * 0.4;
        const rSteps = [ri, rHub, rWeb, ro];
        const tSteps = [th, th, tWeb, t];
        for (let s = 0; s < rSteps.length - 1; s++) {
          const subN = Math.max(5, Math.floor(n / 3));
          for (let i = 0; i <= subN; i++) {
            const r = rSteps[s] + (rSteps[s + 1] - rSteps[s]) * (i / subN);
            points.push({ x: cxToX(r), yTop: thicknessToY(tSteps[s]), yBot: CS_H - thicknessToY(tSteps[s]) });
          }
        }
        break;
      }
    }
    return points;
  };

  const crossSectionPointsStr = () => {
    const pts = crossSectionPath();
    if (pts.length === 0) return "";
    const top = pts.map((p) => `${p.x},${p.yTop}`).join(" ");
    const bot = [...pts].reverse().map((p) => `${p.x},${p.yBot}`).join(" ");
    return `M ${top} L ${bot} Z`;
  };

  return (
    <div class="w-full h-full select-none"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      style={{ cursor: dragging() ? "grabbing" : "grab" }}
    >
      <svg width="100%" height="100%" viewBox={vb()} class="bg-[#0a0f14] rounded"
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

        {/* Outer circle */}
        <circle cx="0" cy="0" r={maxR() * rScale()} fill={ft() === FlywheelType.SolidDisk ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)"} stroke="#3B82F6" stroke-width="2" />

        {/* Inner / Bore */}
        <Show when={p().r_i > 0 && ft() !== FlywheelType.SolidDisk}>
          <circle cx="0" cy="0" r={p().r_i * rScale()} fill="#0b1120" stroke="#10B981" stroke-width="1.5" />
        </Show>

        {/* Hub */}
        <Show when={p().r_hub > 0 && p().r_hub < p().r_o && ft() !== FlywheelType.ConstantStrength && ft() !== FlywheelType.MultiLayerComposite}>
          <circle cx="0" cy="0" r={p().r_hub * rScale()} fill="none" stroke="#8B5CF6" stroke-width="1" stroke-dasharray="4 4" />
        </Show>

        {/* Center point */}
        <circle cx="0" cy="0" r="3" fill="#9CA3AF" />

        {/* Labels */}
        <text x="5" y={-maxR() * rScale() - 8} fill="#3B82F6" font-size="11">Ro={p().r_o}</text>
        <Show when={p().r_i > 0 && ft() !== FlywheelType.SolidDisk}>
          <text x={p().r_i * rScale() + 8} y="4" fill="#10B981" font-size="11">Ri={p().r_i}</text>
        </Show>
        <Show when={p().r_hub > 0 && p().r_hub < p().r_o && ft() !== FlywheelType.ConstantStrength && ft() !== FlywheelType.MultiLayerComposite}>
          <text x={p().r_hub * rScale() + 8} y="-8" fill="#8B5CF6" font-size="10">Hub={p().r_hub}</text>
        </Show>

        {/* Type overlay label */}
        <text x="0" y="14" text-anchor="middle" fill="#64748B" font-size="10" opacity="0.7">
          {ft() === FlywheelType.SolidDisk ? "实心圆盘" :
           ft() === FlywheelType.AnnularRing ? "环形等厚轮" :
           ft() === FlywheelType.TaperedDisk ? "锥形盘" :
           ft() === FlywheelType.ConstantStrength ? "等强度轮" : "多层复合轮"}
        </text>
      </svg>

      {/* ── Cross-section view ── */}
      <Show when={needsCrossSection()}>
        <div class="mt-1 border border-[#1a2e22] rounded bg-[#0d1419] px-2 py-1" style={{ "min-height": "100px" }}>
          <div class="text-[9px] text-gray-500 mb-0.5">厚度剖面</div>
          <svg width="100%" height="80" viewBox={`0 0 ${CS_W} ${CS_H}`}>
            {/* Center line */}
            <line x1={CS_PAD} y1={CS_H/2} x2={CS_W - CS_PAD} y2={CS_H/2} stroke="#334155" stroke-width="0.5" />
            {/* Cross-section fill */}
            <path d={crossSectionPointsStr()} fill="rgba(59,130,246,0.2)" stroke="#3B82F6" stroke-width="1" />
            {/* Labels */}
            <text x={CS_PAD + 2} y={CS_H/2 - 2} fill="#10B981" font-size="8">Ri</text>
            <text x={CS_W - CS_PAD - 20} y={CS_H/2 - 2} fill="#3B82F6" font-size="8">Ro</text>
          </svg>
        </div>
      </Show>

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

      {/* Reset + zoom indicator */}
      <div class="absolute bottom-2 right-2 flex items-center space-x-1.5">
        <button onClick={() => { setZoom(1); setPanX(0); setPanY(0); }}
          class="text-[9px] px-2 py-0.5 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] hover:text-white transition-colors">
          ⟲
        </button>
        <span class="text-[9px] text-gray-500 bg-[#0d1419]/80 px-1.5 py-0.5 rounded">
          {(zoom() * 100).toFixed(0)}% | 滚轮缩放·拖拽
        </span>
      </div>
    </div>
  );
};

export default SectionPreview;

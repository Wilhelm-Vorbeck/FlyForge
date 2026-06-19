import { Component, createSignal, Show } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType } from "../types";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const ft = () => p().flywheel_type;

  // ── Top circle preview zoom & pan ──
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

  // ── Cross-section zoom & pan (independent) ──
  const [csZoom, setCsZoom] = createSignal(1);
  const [csPanX, setCsPanX] = createSignal(0);
  const [csPanY, setCsPanY] = createSignal(0);
  const [csDragging, setCsDragging] = createSignal(false);
  let csLastX = 0, csLastY = 0;

  const onCsWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    setCsZoom(z => Math.max(0.3, Math.min(5, z * delta)));
  };

  const onCsMouseDown = (e: MouseEvent) => {
    if (e.button !== 0) return;
    setCsDragging(true);
    csLastX = e.clientX;
    csLastY = e.clientY;
  };

  const onCsMouseMove = (e: MouseEvent) => {
    if (!csDragging()) return;
    setCsPanX(px => px + (e.clientX - csLastX));
    setCsPanY(py => py + (e.clientY - csLastY));
    csLastX = e.clientX;
    csLastY = e.clientY;
  };

  const onCsMouseUp = () => setCsDragging(false);

  const csVb = () => {
    const s = 130 / csZoom();
    const cx = -csPanX() / csZoom();
    const cy = -csPanY() / csZoom();
    return `${cx - s} ${cy - s} ${s * 2} ${s * 2}`;
  };

  // ── Cross-section geometry helpers ──
  const CS_GRID = 20;

  const csThicknessMax = () => {
    const layers = p().layer_configs;
    if (layers && layers.length > 0) {
      return Math.max(...layers.map(l => l.thickness), 1);
    }
    return Math.max(p().thickness, p().hub_thickness, 1);
  };

  const cxToX = (r: number) => {
    const rMax = p().r_o;
    return CS_PAD + (r / Math.max(rMax, 1)) * plotW;
  };

  const CS_PAD = 10;
  const plotW = 230;
  const CS_W = plotW + 2 * CS_PAD;

  const thicknessToY = (t: number) => {
    const tMax = csThicknessMax();
    return 40 - (t / tMax) * 36;
  };
  const CS_H = 80;

  // Generate cross-section path points
  const crossSectionPath = () => {
    const ro = p().r_o;
    const ri = p().r_i;
    const t = p().thickness;
    const th = p().hub_thickness;
    const n = 80;
    let points: { x: number; yTop: number; yBot: number }[] = [];

    switch (ft()) {
      case FlywheelType.SolidDisk: {
        // Flat disk — constant thickness
        for (let i = 0; i <= n; i++) {
          const r = 0 + ro * (i / n);
          points.push({ x: cxToX(r), yTop: thicknessToY(t), yBot: CS_H - thicknessToY(t) });
        }
        break;
      }
      case FlywheelType.AnnularRing: {
        // Constant thickness ring (hub + rim)
        const rHub = p().r_hub;
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const ht = r <= rHub ? th : t;
          points.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      }
      case FlywheelType.TaperedDisk: {
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const frac = (r - ri) / (ro - ri || 1);
          const ht = th - (th - t) * frac;
          points.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      }
      case FlywheelType.ConstantStrength: {
        const t0 = t;
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const ht = t0 * (ri / r);
          points.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      }
      case FlywheelType.MultiLayerComposite: {
        const layers = p().layer_configs;
        if (layers && layers.length > 0) {
          const lrs = [ri, ...layers.map((l) => l.outer_radius)];
          const lts = layers.map((l) => l.thickness);
          for (let s = 0; s < lts.length; s++) {
            const subN = Math.max(12, Math.floor(n / lts.length));
            for (let i = 0; i <= subN; i++) {
              const r = lrs[s] + (lrs[s + 1] - lrs[s]) * (i / subN);
              points.push({ x: cxToX(r), yTop: thicknessToY(lts[s]), yBot: CS_H - thicknessToY(lts[s]) });
            }
          }
        } else {
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

  // Layer boundary vertical lines for multi-layer
  const layerBoundaryLines = () => {
    const layers = p().layer_configs;
    if (!layers || layers.length === 0 || ft() !== FlywheelType.MultiLayerComposite) return null;
    const lines: { x: number }[] = [];
    for (const l of layers) {
      const x = cxToX(l.outer_radius);
      const yTop = thicknessToY(l.thickness);
      lines.push({ x });
    }
    return lines;
  };

  return (
    <div class="w-full h-full select-none flex flex-col overflow-hidden"
      style={{ cursor: dragging() ? "grabbing" : "grab" }}
    >
      {/* ── Top: circle preview (flex-1, takes remaining space) ── */}
      <div class="relative flex-shrink-0 flex flex-col" style={{ flex: "5" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}>
        <svg width="100%" height="100%" viewBox={vb()} class="bg-[#0a0f14] rounded" style={{ "min-height": "80px" }}>
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

          <circle cx="0" cy="0" r={maxR() * rScale()} fill={ft() === FlywheelType.SolidDisk ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)"} stroke="#3B82F6" stroke-width="2" />

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
            {ft() === FlywheelType.SolidDisk ? "实心圆盘" :
             ft() === FlywheelType.AnnularRing ? "环形等厚轮" :
             ft() === FlywheelType.TaperedDisk ? "锥形盘" :
             ft() === FlywheelType.ConstantStrength ? "等强度轮" : "多层复合轮"}
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

        {/* Zoom indicator */}
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

      {/* ── Bottom: cross-section (flex-1, shares proportionally) ── */}
      <div class="flex-shrink-0 mt-1 border border-[#1a2e22] rounded bg-[#0d1419] flex flex-col"
        style={{ cursor: csDragging() ? "grabbing" : "grab", flex: "2", "min-height": "60px" }}
        onWheel={onCsWheel}
        onMouseDown={onCsMouseDown}
        onMouseMove={onCsMouseMove}
        onMouseUp={onCsMouseUp}
        onMouseLeave={onCsMouseUp}>
        <div class="flex items-center justify-between px-2 pt-1">
          <div class="text-[9px] text-gray-500">厚度剖面</div>
          <div class="flex items-center space-x-1">
            <button onClick={() => { setCsZoom(1); setCsPanX(0); setCsPanY(0); }}
              class="text-[9px] px-1.5 py-0 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] transition-colors">⟲</button>
            <span class="text-[8px] text-gray-600">{(csZoom() * 100).toFixed(0)}%</span>
          </div>
        </div>
        <svg width="100%" class="flex-1" viewBox={csVb()} style={{ "min-height": "40px" }}>
          <defs>
            <pattern id="csGrid" width={CS_GRID} height={CS_GRID} patternUnits="userSpaceOnUse">
              <path d={`M ${CS_GRID} 0 L 0 0 0 ${CS_GRID}`} fill="none" stroke="#1e293b" stroke-width="0.4" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={CS_W} height={CS_H} fill="url(#csGrid)" />

          {/* Center line */}
          <line x1={CS_PAD} y1={CS_H/2} x2={CS_W - CS_PAD} y2={CS_H/2} stroke="#334155" stroke-width="0.5" />

          {/* Cross-section fill */}
          <path d={crossSectionPointsStr()} fill="rgba(59,130,246,0.2)" stroke="#3B82F6" stroke-width="1" />

          {/* Layer boundary lines for multi-layer */}
          <Show when={ft() === FlywheelType.MultiLayerComposite}>
            {layerBoundaryLines()?.map(l => (
              <line x1={l.x} y1={CS_H/2 - 38} x2={l.x} y2={CS_H/2 + 38} stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.7" />
            ))}
          </Show>

          {/* Labels */}
          <text x={CS_PAD + 2} y={CS_H/2 - 3} fill="#10B981" font-size="8">Ri</text>
          <text x={CS_W - CS_PAD - 20} y={CS_H/2 - 3} fill="#3B82F6" font-size="8">Ro</text>
        </svg>
      </div>
    </div>
  );
};

export default SectionPreview;

import { Component, createSignal, Show } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType } from "../types";

interface CrossSectionProps {
  visible: boolean;
  onToggle: () => void;
}

const CrossSection: Component<CrossSectionProps> = (props) => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const ft = () => p().flywheel_type;

  // ── Zoom & pan ──
  const [zoom, setZoom] = createSignal(1);
  const [panX, setPanX] = createSignal(0);
  const [panY, setPanY] = createSignal(0);
  const [dragging, setDragging] = createSignal(false);
  let lastX = 0, lastY = 0;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.3, Math.min(5, z * delta)));
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

  const resetView = () => { setZoom(1); setPanX(0); setPanY(0); };

  // ── ViewBox ──
  const CS_PAD = 10;
  const plotW = 230;
  const CS_W = plotW + 2 * CS_PAD;
  const CS_H = 80;

  const vb = () => {
    const s = 130 / zoom();
    const cx = -panX() / zoom();
    const cy = -panY() / zoom();
    return `${cx - s} ${cy - s} ${s * 2} ${s * 2}`;
  };

  // ── Geometry ──
  const csThicknessMax = () => {
    const layers = p().layer_configs;
    if (layers && layers.length > 0) return Math.max(...layers.map(l => l.thickness), 1);
    return Math.max(p().thickness, p().hub_thickness, 1);
  };

  const cxToX = (r: number) => CS_PAD + (r / Math.max(p().r_o, 1)) * plotW;

  const thicknessToY = (t: number) => {
    const tMax = csThicknessMax();
    return 40 - (t / tMax) * 36;
  };

  // ── Points ──
  const buildPath = () => {
    const ro = p().r_o, ri = p().r_i, t = p().thickness, th = p().hub_thickness;
    const n = 80;
    let pts: { x: number; yTop: number; yBot: number }[] = [];

    switch (ft()) {
      case FlywheelType.SolidDisk:
        for (let i = 0; i <= n; i++) {
          const r = ro * (i / n);
          pts.push({ x: cxToX(r), yTop: thicknessToY(t), yBot: CS_H - thicknessToY(t) });
        }
        break;
      case FlywheelType.AnnularRing:
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const ht = r <= p().r_hub ? th : t;
          pts.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      case FlywheelType.TaperedDisk:
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const frac = (r - ri) / (ro - ri || 1);
          const ht = th - (th - t) * frac;
          pts.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      case FlywheelType.ConstantStrength:
        for (let i = 0; i <= n; i++) {
          const r = ri + (ro - ri) * (i / n);
          const ht = t * (ri / r);
          pts.push({ x: cxToX(r), yTop: thicknessToY(ht), yBot: CS_H - thicknessToY(ht) });
        }
        break;
      case FlywheelType.MultiLayerComposite: {
        const layers = p().layer_configs;
        if (layers && layers.length > 0) {
          const lrs = [ri, ...layers.map(l => l.outer_radius)];
          const lts = layers.map(l => l.thickness);
          for (let s = 0; s < lts.length; s++) {
            const subN = Math.max(12, Math.floor(n / lts.length));
            for (let i = 0; i <= subN; i++) {
              const r = lrs[s] + (lrs[s + 1] - lrs[s]) * (i / subN);
              pts.push({ x: cxToX(r), yTop: thicknessToY(lts[s]), yBot: CS_H - thicknessToY(lts[s]) });
            }
          }
        } else {
          const rHub = p().r_hub, rWeb = ro * 0.85, tWeb = t * 0.4;
          const rSteps = [ri, rHub, rWeb, ro];
          const tSteps = [th, th, tWeb, t];
          for (let s = 0; s < rSteps.length - 1; s++) {
            const subN = Math.max(5, Math.floor(n / 3));
            for (let i = 0; i <= subN; i++) {
              const r = rSteps[s] + (rSteps[s + 1] - rSteps[s]) * (i / subN);
              pts.push({ x: cxToX(r), yTop: thicknessToY(tSteps[s]), yBot: CS_H - thicknessToY(tSteps[s]) });
            }
          }
        }
        break;
      }
    }
    return pts;
  };

  const pathStr = () => {
    const pts = buildPath();
    if (pts.length === 0) return "";
    const top = pts.map(p => `${p.x},${p.yTop}`).join(" ");
    const bot = [...pts].reverse().map(p => `${p.x},${p.yBot}`).join(" ");
    return `M ${top} L ${bot} Z`;
  };

  const layerLines = () => {
    const layers = p().layer_configs;
    if (!layers || layers.length === 0 || ft() !== FlywheelType.MultiLayerComposite) return null;
    return layers.map(l => ({ x: cxToX(l.outer_radius) }));
  };

  return (
    <Show when={props.visible}>
      <div class="flex-shrink-0 border-y border-[#1a2e22] bg-[#0d1419] flex flex-col"
        style={{ height: "88px" }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Header bar */}
        <div class="flex items-center justify-between px-2 py-0.5 flex-shrink-0" style={{ height: "16px" }}>
          <span class="text-[9px] text-gray-500">厚度剖面</span>
          <div class="flex items-center space-x-1.5">
            <span class="text-[8px] text-gray-600">{(zoom() * 100).toFixed(0)}% | 滚轮·拖拽</span>
            <button onClick={resetView}
              class="text-[9px] px-1.5 py-0 rounded bg-[#1a2e22] text-emerald-400 hover:bg-[#2a4a32] transition-colors">⟲</button>
            <button onClick={props.onToggle}
              class="text-[9px] px-1.5 py-0 rounded bg-[#1a2e22] text-gray-400 hover:bg-[#2a4a32] hover:text-white transition-colors" title="隐藏剖面图">▲</button>
          </div>
        </div>

        {/* SVG */}
        <svg width="100%" class="flex-1" viewBox={vb()}
          style={{ cursor: dragging() ? "grabbing" : "grab", "min-height": "40px" }}>
          <defs>
            <pattern id="csGridP" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" stroke-width="0.4" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={CS_W} height={CS_H} fill="url(#csGridP)" />

          {/* Center line */}
          <line x1={CS_PAD} y1={CS_H/2} x2={CS_W - CS_PAD} y2={CS_H/2} stroke="#334155" stroke-width="0.5" />

          {/* Profile path */}
          <path d={pathStr()} fill="rgba(59,130,246,0.2)" stroke="#3B82F6" stroke-width="1" />

          {/* Layer boundaries (multi-layer only) */}
          <Show when={ft() === FlywheelType.MultiLayerComposite}>
            {layerLines()?.map(l => (
              <line x1={l.x} y1={CS_H/2 - 38} x2={l.x} y2={CS_H/2 + 38}
                stroke="#F59E0B" stroke-width="0.8" stroke-dasharray="3 2" opacity="0.7" />
            ))}
          </Show>

          {/* Labels */}
          <text x={CS_PAD + 2} y={CS_H/2 - 3} fill="#10B981" font-size="8">Ri</text>
          <text x={CS_W - CS_PAD - 20} y={CS_H/2 - 3} fill="#3B82F6" font-size="8">Ro</text>
        </svg>
      </div>
    </Show>
  );
};

export default CrossSection;

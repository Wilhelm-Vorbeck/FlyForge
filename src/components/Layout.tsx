import { Component, createSignal, onCleanup, Show } from "solid-js";
import AccordionPanel from "./AccordionPanel";
import VisualizationPanel from "./VisualizationPanel";
import ResultsPanel from "./ResultsPanel";
import ComparePanel from "./ComparePanel";
import Header from "./Header";
import SectionPreview from "./SectionPreview";
import CrossSection from "./CrossSection";
import { persistLayout } from "../utils/persist";

const Layout: Component = () => {
  const [topRatio, setTopRatio] = createSignal(persistLayout.getTopRatio());
  const [dragging, setDragging] = createSignal(false);
  const [leftOpen, setLeftOpen] = createSignal(persistLayout.getLeftOpen());
  const [rightOpen, setRightOpen] = createSignal(persistLayout.getRightOpen());
  const [csVisible, setCsVisible] = createSignal(persistLayout.getCsVisible());
  const [csHeight, setCsHeight] = createSignal(persistLayout.getCsHeight());
  const [circleZoom, setCircleZoom] = createSignal(1);
  const [circlePanX, setCirclePanX] = createSignal(0);

  const [csResizing, setCsResizing] = createSignal(false);
  const [rightTab, setRightTab] = createSignal<"results" | "compare">("results");
  let csResizeLastY = 0;

  const toggleLeft = () => { const v = !leftOpen(); setLeftOpen(v); persistLayout.setLeftOpen(v); };
  const toggleRight = () => { const v = !rightOpen(); setRightOpen(v); persistLayout.setRightOpen(v); };
  const toggleCs = () => { const v = !csVisible(); setCsVisible(v); persistLayout.setCsVisible(v); };

  const onCircleViewChange = (z: number, px: number) => {
    setCircleZoom(z);
    setCirclePanX(px);
  };

  // ── Top/bottom ratio drag ──
  let containerRef: HTMLDivElement | undefined;

  const onRatioMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    window.addEventListener("mousemove", onRatioMouseMove);
    window.addEventListener("mouseup", onRatioMouseUp);
  };

  const onRatioMouseMove = (e: MouseEvent) => {
    if (!dragging() || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const pct = Math.max(15, Math.min(80, (y / h) * 100));
    setTopRatio(pct);
  };

  const onRatioMouseUp = () => {
    setDragging(false);
    window.removeEventListener("mousemove", onRatioMouseMove);
    window.removeEventListener("mouseup", onRatioMouseUp);
    persistLayout.setTopRatio(topRatio());
  };

  // ── Cross-section height resize ──
  const onCsResizeMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setCsResizing(true);
    csResizeLastY = e.clientY;
    window.addEventListener("mousemove", onCsResizeMouseMove);
    window.addEventListener("mouseup", onCsResizeMouseUp);
  };

  const onCsResizeMouseMove = (e: MouseEvent) => {
    if (!csResizing()) return;
    const dy = csResizeLastY - e.clientY;
    csResizeLastY = e.clientY;
    setCsHeight(h => Math.max(50, Math.min(250, h + dy)));
  };

  const onCsResizeMouseUp = () => {
    setCsResizing(false);
    window.removeEventListener("mousemove", onCsResizeMouseMove);
    window.removeEventListener("mouseup", onCsResizeMouseUp);
    persistLayout.setCsHeight(csHeight());
  };

  onCleanup(() => {
    window.removeEventListener("mousemove", onRatioMouseMove);
    window.removeEventListener("mouseup", onRatioMouseUp);
    window.removeEventListener("mousemove", onCsResizeMouseMove);
    window.removeEventListener("mouseup", onCsResizeMouseUp);
  });

  // Fixed-height knobs
  const dragHandleH = 8;
  const csResizeH = 6;
  const csFixed = csVisible() ? csHeight() + csResizeH : 0;
  const totalFixed = csFixed + dragHandleH;

  return (
    <div class="h-screen flex flex-col overflow-hidden">
      <Header leftOpen={leftOpen} rightOpen={rightOpen} onToggleLeft={toggleLeft} onToggleRight={toggleRight} csVisible={csVisible} onToggleCs={toggleCs} />

      <div class="flex flex-1 overflow-hidden min-h-0">
        <aside class={`${leftOpen() ? "w-56" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-[#0d1419] border-r border-[#1a2e22]`}>
          <AccordionPanel />
        </aside>

        <div ref={containerRef} class="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top: circle preview */}
          <div class="overflow-auto bg-[#0a0f14] p-2"
            style={{ height: `calc((100% - ${totalFixed}px) * ${topRatio()} / 100)` }}>
            <SectionPreview onViewChange={onCircleViewChange} />
          </div>

          {/* CS resize handle */}
          <Show when={csVisible()}>
            <div
              class={`h-1.5 flex-shrink-0 flex items-center justify-center cursor-row-resize select-none ${
                csResizing() ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-600"
              }`}
              onMouseDown={onCsResizeMouseDown}
            >
              <div class="w-6 h-0.5 bg-gray-500 rounded" />
            </div>
          </Show>

          {/* Cross-section bar */}
          <CrossSection visible={csVisible()} onToggle={toggleCs}
            baseZoom={circleZoom()} basePanX={circlePanX()} height={csHeight()} />

          {/* Top/bottom ratio drag handle */}
          <div
            class={`h-2 flex-shrink-0 flex items-center justify-center cursor-row-resize select-none transition-colors ${
              dragging() ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            onMouseDown={onRatioMouseDown}
          >
            <div class="w-8 h-0.5 bg-gray-500 rounded" />
          </div>

          {/* Bottom: charts */}
          <div class="overflow-auto bg-[#0a0f14] p-2"
            style={{ height: `calc((100% - ${totalFixed}px) * ${100 - topRatio()} / 100)` }}>
            <VisualizationPanel />
          </div>
        </div>

        <aside class={`${rightOpen() ? "w-60" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-[#0d1419] border-l border-[#1a2e22] flex flex-col`}>
          {/* Right sidebar tabs */}
          <div class="flex-shrink-0 flex border-b border-[#1a2e22]">
            <button onClick={() => setRightTab("results")}
              class={`flex-1 py-1.5 text-[10px] text-center transition-colors ${
                rightTab() === "results" ? "text-emerald-300 border-b-2 border-emerald-600" : "text-gray-500 hover:text-gray-400"
              }`}>结果</button>
            <button onClick={() => setRightTab("compare")}
              class={`flex-1 py-1.5 text-[10px] text-center transition-colors ${
                rightTab() === "compare" ? "text-emerald-300 border-b-2 border-emerald-600" : "text-gray-500 hover:text-gray-400"
              }`}>方案对比</button>
          </div>
          <div class="flex-1 overflow-y-auto p-2">
            {rightTab() === "results" ? <ResultsPanel /> : <ComparePanel />}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout;

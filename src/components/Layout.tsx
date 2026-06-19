import { Component, createSignal, onCleanup } from "solid-js";
import AccordionPanel from "./AccordionPanel";
import VisualizationPanel from "./VisualizationPanel";
import ResultsPanel from "./ResultsPanel";
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

  const toggleLeft = () => {
    const v = !leftOpen();
    setLeftOpen(v);
    persistLayout.setLeftOpen(v);
  };
  const toggleRight = () => {
    const v = !rightOpen();
    setRightOpen(v);
    persistLayout.setRightOpen(v);
  };
  const toggleCs = () => {
    const v = !csVisible();
    setCsVisible(v);
    persistLayout.setCsVisible(v);
  };

  let containerRef: HTMLDivElement | undefined;

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (!dragging() || !containerRef) return;
    const rect = containerRef.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const h = rect.height;
    const pct = Math.max(15, Math.min(80, (y / h) * 100));
    setTopRatio(pct);
  };

  const onMouseUp = () => {
    setDragging(false);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    persistLayout.setTopRatio(topRatio());
  };

  onCleanup(() => {
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
  });

  return (
    <div class="h-screen flex flex-col overflow-hidden">
      <Header leftOpen={leftOpen} rightOpen={rightOpen} onToggleLeft={toggleLeft} onToggleRight={toggleRight} csVisible={csVisible} onToggleCs={toggleCs} />

      <div class="flex flex-1 overflow-hidden min-h-0">
        {/* Left sidebar */}
        <aside class={`${leftOpen() ? "w-56" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-[#0d1419] border-r border-[#1a2e22]`}>
          <AccordionPanel />
        </aside>

        {/* Center */}
        <div ref={containerRef} class="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Fixed offset: cross-section (88px when visible) + drag handle (8px) */}
          {/* Top: circle preview */}
          <div class="overflow-auto bg-[#0a0f14] p-2"
            style={{
              height: csVisible()
                ? `calc((100% - 96px) * ${topRatio()} / 100)`
                : `calc((100% - 8px) * ${topRatio()} / 100)`
            }}>
            <SectionPreview />
          </div>

          {/* Cross-section bar — fixed 88px, between preview and drag handle */}
          <CrossSection visible={csVisible()} onToggle={toggleCs} />

          {/* Drag handle */}
          <div
            class={`h-2 flex-shrink-0 flex items-center justify-center cursor-row-resize select-none transition-colors ${
              dragging() ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            onMouseDown={onMouseDown}
          >
            <div class="w-8 h-0.5 bg-gray-500 rounded" />
          </div>

          {/* Bottom: charts */}
          <div class="overflow-auto bg-[#0a0f14] p-2"
            style={{
              height: csVisible()
                ? `calc((100% - 96px) * ${100 - topRatio()} / 100)`
                : `calc((100% - 8px) * ${100 - topRatio()} / 100)`
            }}>
            <VisualizationPanel />
          </div>
        </div>

        {/* Right sidebar */}
        <aside class={`${rightOpen() ? "w-60" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-[#0d1419] border-l border-[#1a2e22]`}>
          <ResultsPanel />
        </aside>
      </div>
    </div>
  );
};

export default Layout;

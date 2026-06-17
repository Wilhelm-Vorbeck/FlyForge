import { Component, createSignal } from "solid-js";
import AccordionPanel from "./AccordionPanel";
import VisualizationPanel from "./VisualizationPanel";
import ResultsPanel from "./ResultsPanel";
import Header from "./Header";
import SectionPreview from "./SectionPreview";

const Layout: Component = () => {
  const [topRatio, setTopRatio] = createSignal(50);
  const [dragging, setDragging] = createSignal(false);
  const [leftOpen, setLeftOpen] = createSignal(true);
  const [rightOpen, setRightOpen] = createSignal(true);

  let containerRef: HTMLDivElement | undefined;

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    const rect = containerRef!.getBoundingClientRect();
    const onMove = (ev: MouseEvent) => {
      const pct = ((ev.clientY - rect.top) / rect.height) * 100;
      setTopRatio(Math.max(20, Math.min(80, pct)));
    };
    const onUp = () => {
      setDragging(false);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  return (
    <div class="flex flex-col h-screen overflow-hidden bg-gray-900 text-white">
      <Header leftOpen={leftOpen} rightOpen={rightOpen} onToggleLeft={() => setLeftOpen(!leftOpen())} onToggleRight={() => setRightOpen(!rightOpen())} />
      <div class="flex flex-1 overflow-hidden min-h-0">
        {/* Left */}
        <aside class={`${leftOpen() ? "w-56" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-gray-800 border-r border-gray-700`}>
          <AccordionPanel />
        </aside>

        {/* Center: Resizable top/bottom */}
        <div ref={containerRef} class="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top: Preview */}
          <div class="overflow-hidden bg-gray-900 p-2 relative" style={{ height: `${topRatio()}%` }}>
            <SectionPreview />
          </div>

          {/* Drag handle */}
          <div
            class={`h-2 flex-shrink-0 flex items-center justify-center cursor-row-resize select-none transition-colors ${
              dragging() ? "bg-emerald-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
            onMouseDown={onMouseDown}
          >
            <div class="w-8 h-0.5 bg-gray-500 rounded" />
          </div>

          {/* Bottom: Charts */}
          <div class="overflow-auto bg-gray-900 p-2" style={{ height: `${100 - topRatio()}%` }}>
            <VisualizationPanel />
          </div>
        </div>

        {/* Right */}
        <aside class={`${rightOpen() ? "w-60" : "w-0"} transition-all duration-200 flex-shrink-0 overflow-hidden bg-gray-800 border-l border-gray-700`}>
          <div class="w-60 p-3">
            <ResultsPanel />
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Layout;

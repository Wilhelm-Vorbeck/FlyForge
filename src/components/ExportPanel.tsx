import { Component, Show, createSignal } from "solid-js";
import { useAppContext } from "../store";
import {
  exportSimulationCsv,
  exportSimulationJson,
  exportSimulationSvg,
  exportParams,
} from "../services/api";

const ExportPanel: Component = () => {
  const ctx = useAppContext();
  const [status, setStatus] = createSignal<string | null>(null);
  const sim = () => ctx.state().simulation;

  const handleExport = async (fmt: "csv" | "json" | "svg" | "params") => {
    const s = sim();
    if (!s && fmt !== "params") { setStatus("请先运行仿真"); return; }
    setStatus("导出中...");
    try {
      let content: string;
      let filename: string;
      let mime: string;
      if (fmt === "csv")      { content = await exportSimulationCsv(s!);    filename = `flyforge_${Date.now()}.csv`;  mime = "text/csv"; }
      else if (fmt === "json") { content = await exportSimulationJson(s!);  filename = `flyforge_${Date.now()}.json`; mime = "application/json"; }
      else if (fmt === "svg")  { content = await exportSimulationSvg(s!);   filename = `flyforge_${Date.now()}.svg`;  mime = "image/svg+xml"; }
      else                     { content = await exportParams(ctx.state().params); filename = `params_${Date.now()}.json`; mime = "application/json"; }
      const blob = new Blob([content], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus(`已导出 ${filename}`);
      setTimeout(() => setStatus(null), 2000);
    } catch (err) {
      setStatus(`失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const btn = (fmt: "csv" | "json" | "svg" | "params", label: string, cls: string, needSim = true) => (
    <button
      onClick={() => handleExport(fmt)}
      disabled={needSim && !sim()}
      class={`flex-1 flex items-center justify-center space-x-1 px-2 py-2 rounded text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      <span>{label}</span>
    </button>
  );

  return (
    <div>
      <div class="flex space-x-2">
        {btn("csv", "CSV", "bg-green-700/50 hover:bg-green-700 text-green-300")}
        {btn("json", "JSON", "bg-blue-700/50 hover:bg-blue-700 text-blue-300")}
        {btn("svg", "SVG", "bg-purple-700/50 hover:bg-purple-700 text-purple-300")}
        {btn("params", "参数", "bg-yellow-700/50 hover:bg-yellow-700 text-yellow-300", false)}
      </div>
      <Show when={status()}>
        <p class="text-xs text-center text-blue-400 mt-1.5">{status()}</p>
      </Show>
    </div>
  );
};

export default ExportPanel;

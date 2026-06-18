import { Component, Show, createSignal } from "solid-js";
import { useAppContext } from "../store";
import { invoke } from "@tauri-apps/api/core";
import {
  exportSimulationCsv,
  exportSimulationJson,
  exportSimulationSvg,
  exportParams,
} from "../services/api";

const ExportPanel: Component = () => {
  const ctx = useAppContext();
  const [status, setStatus] = createSignal<string | null>(null);
  const [useDialog, setUseDialog] = createSignal(false);
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

      if (useDialog()) {
        try {
          const ext = fmt === "svg" ? ".svg" : fmt === "csv" ? ".csv" : ".json";
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: fmt === "svg" ? "SVG文件" : fmt === "csv" ? "CSV文件" : "JSON文件",
              accept: { [mime]: [ext] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(content);
          await writable.close();
          setStatus(`已保存到: ${handle.name}`);
        } catch (dialogErr: any) {
          if (dialogErr?.name === "AbortError") {
            setStatus(null);
          } else {
            // Fallback: invoke backend
            const filePath = prompt("输入保存路径（含文件名）:", filename);
            if (filePath) {
              await invoke("save_file_content", { path: filePath, content });
              setStatus(`已保存到: ${filePath}`);
            } else {
              setStatus(null);
            }
          }
        }
      } else {
        // Default: browser download
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
      }
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus(`失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div>
      <div class="flex items-center justify-between mb-1">
        <p class="text-[10px] text-gray-500">导出</p>
        <label class="flex items-center space-x-1 cursor-pointer">
          <input type="checkbox" checked={useDialog()} onChange={(e) => setUseDialog(e.currentTarget.checked)}
            class="w-3 h-3 rounded" />
          <span class="text-[9px] text-gray-400">自定义路径</span>
        </label>
      </div>
      <div class="grid grid-cols-2 gap-1">
        <button onClick={() => handleExport("csv")} disabled={!sim()}
          class="text-[10px] py-1 rounded bg-[#0f2a1a]/60 text-emerald-400 hover:bg-[#0f2a1a]/80 disabled:opacity-40 transition-colors border border-[#1a4a2e]">
          CSV
        </button>
        <button onClick={() => handleExport("json")} disabled={!sim()}
          class="text-[10px] py-1 rounded bg-[#0f2a1a]/60 text-emerald-400 hover:bg-[#0f2a1a]/80 disabled:opacity-40 transition-colors border border-[#1a4a2e]">
          JSON
        </button>
        <button onClick={() => handleExport("svg")} disabled={!sim()}
          class="text-[10px] py-1 rounded bg-[#1a0f2a]/60 text-purple-400 hover:bg-[#1a0f2a]/80 disabled:opacity-40 transition-colors border border-[#2a1a4a]">
          SVG
        </button>
        <button onClick={() => handleExport("params")}
          class="text-[10px] py-1 rounded bg-[#2a220a]/60 text-yellow-400 hover:bg-[#2a220a]/80 transition-colors border border-[#4a3a1a]">
          参数
        </button>
      </div>
      <Show when={status()}>
        <p class="text-[9px] text-center text-emerald-400 mt-1 truncate" title={status()!}>{status()}</p>
      </Show>
    </div>
  );
};

export default ExportPanel;

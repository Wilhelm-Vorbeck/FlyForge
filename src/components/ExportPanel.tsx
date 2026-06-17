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
        // Use Tauri save dialog
        try {
          const ext = fmt === "svg" ? "svg" : fmt === "csv" ? "csv" : "json";
          const filterName = fmt === "svg" ? "SVG文件" : fmt === "csv" ? "CSV文件" : "JSON文件";
          const filePath = await invoke<string | null>("show_save_dialog", {
            defaultName: filename,
            extension: ext,
            filterName,
          });
          if (filePath) {
            await invoke("save_file_content", { path: filePath, content });
            setStatus(`已保存到: ${filePath}`);
          } else {
            setStatus(null);
          }
        } catch (dialogErr) {
          setStatus(`对话框错误: ${dialogErr}`);
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
          class="text-[10px] py-1 rounded bg-green-800/40 text-green-400 hover:bg-green-800/60 disabled:opacity-40 transition-colors">
          CSV
        </button>
        <button onClick={() => handleExport("json")} disabled={!sim()}
          class="text-[10px] py-1 rounded bg-blue-800/40 text-blue-400 hover:bg-blue-800/60 disabled:opacity-40 transition-colors">
          JSON
        </button>
        <button onClick={() => handleExport("svg")} disabled={!sim()}
          class="text-[10px] py-1 rounded bg-purple-800/40 text-purple-400 hover:bg-purple-800/60 disabled:opacity-40 transition-colors">
          SVG
        </button>
        <button onClick={() => handleExport("params")}
          class="text-[10px] py-1 rounded bg-yellow-800/40 text-yellow-400 hover:bg-yellow-800/60 transition-colors">
          参数
        </button>
      </div>
      <Show when={status()}>
        <p class="text-[9px] text-center text-blue-400 mt-1 truncate" title={status()!}>{status()}</p>
      </Show>
    </div>
  );
};

export default ExportPanel;

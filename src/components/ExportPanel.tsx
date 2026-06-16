import { Component, Show, createSignal } from "solid-js";
import { useAppContext } from "../store";
import {
  exportSimulationCsv,
  exportSimulationJson,
  exportSimulationSvg,
  exportParams,
} from "../services/api";

const ExportPanel: Component = () => {
  const context = useAppContext();
  const [exportStatus, setExportStatus] = createSignal<string | null>(null);
  const sim = () => context.state().simulation;

  const handleExport = async (format: "csv" | "json" | "svg" | "params") => {
    const simulation = sim();
    if (!simulation && format !== "params") {
      setExportStatus("请先运行仿真");
      return;
    }

    setExportStatus("导出中...");

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      switch (format) {
        case "csv":
          content = await exportSimulationCsv(simulation!);
          filename = `flyforge_result_${Date.now()}.csv`;
          mimeType = "text/csv";
          break;
        case "json":
          content = await exportSimulationJson(simulation!);
          filename = `flyforge_result_${Date.now()}.json`;
          mimeType = "application/json";
          break;
        case "svg":
          content = await exportSimulationSvg(simulation!);
          filename = `flyforge_stress_${Date.now()}.svg`;
          mimeType = "image/svg+xml";
          break;
        case "params":
          content = await exportParams(context.state().params);
          filename = `flyforge_params_${Date.now()}.json`;
          mimeType = "application/json";
          break;
        default:
          throw new Error("Unknown format");
      }

      // Create download link
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus(`已导出: ${filename}`);
      setTimeout(() => setExportStatus(null), 3000);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setExportStatus(`导出失败: ${errorMsg}`);
    }
  };

  return (
    <div class="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 class="text-sm font-medium text-gray-300 mb-4">导出结果</h3>

      <div class="grid grid-cols-2 gap-3">
        {/* CSV Export */}
        <button
          onClick={() => handleExport("csv")}
          disabled={!sim()}
          class="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-sm text-white">CSV 数据</span>
        </button>

        {/* JSON Export */}
        <button
          onClick={() => handleExport("json")}
          disabled={!sim()}
          class="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span class="text-sm text-white">JSON 完整</span>
        </button>

        {/* SVG Export */}
        <button
          onClick={() => handleExport("svg")}
          disabled={!sim()}
          class="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-sm text-white">SVG 应力图</span>
        </button>

        {/* Params Export */}
        <button
          onClick={() => handleExport("params")}
          class="flex items-center justify-center space-x-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span class="text-sm text-white">参数配置</span>
        </button>
      </div>

      {/* Status message */}
      <Show when={exportStatus()}>
        <div class="mt-3 text-sm text-center text-blue-400">{exportStatus()}</div>
      </Show>
    </div>
  );
};

export default ExportPanel;

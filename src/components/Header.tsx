import { Component, Show } from "solid-js";
import { useAppContext } from "../store";

const Header: Component = () => {
  const ctx = useAppContext();

  return (
    <header class="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-2">
        <div class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke-width="2" />
            <circle cx="12" cy="12" r="3" stroke-width="2" />
          </svg>
        </div>
        <span class="text-sm font-bold">FlyForge</span>
        <span class="text-[10px] text-gray-500">v0.1.0</span>
      </div>

      <div class="flex items-center space-x-3">
        {/* Error takes priority over loading */}
        <Show when={ctx.state().error && !ctx.state().isLoading}>
          <span class="text-[10px] text-red-400 truncate max-w-[300px]" title={ctx.state().error!}>
            ⚠ {ctx.state().error}
          </span>
        </Show>
        <Show when={ctx.state().isLoading && !ctx.state().error}>
          <span class="text-[10px] text-blue-400 flex items-center space-x-1">
            <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>计算中</span>
          </span>
        </Show>
        <button onClick={ctx.resetParams} class="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
          重置
        </button>
      </div>
    </header>
  );
};

export default Header;

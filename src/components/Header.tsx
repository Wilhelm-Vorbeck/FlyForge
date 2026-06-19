import { Component, Show, Accessor } from "solid-js";
import { useAppContext } from "../store";

interface HeaderProps {
  leftOpen: Accessor<boolean>;
  rightOpen: Accessor<boolean>;
  onToggleLeft: () => void;
  onToggleRight: () => void;
  csVisible: Accessor<boolean>;
  onToggleCs: () => void;
}

const Header: Component<HeaderProps> = (props) => {
  const ctx = useAppContext();

  return (
    <header class="bg-[#0a0f14] border-b border-[#1a2e22] px-4 py-2 flex items-center justify-between flex-shrink-0">
      <div class="flex items-center space-x-2">
        {/* Toggle left sidebar */}
        <button onClick={props.onToggleLeft} class={`p-1.5 rounded transition-colors ${props.leftOpen() ? "text-emerald-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-700"}`} title="切换参数面板">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div class="w-6 h-6 bg-emerald-600 rounded flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke-width="2" />
            <circle cx="12" cy="12" r="3" stroke-width="2" />
          </svg>
        </div>
        <span class="text-sm font-bold">FlyForge</span>
        <span class="text-[10px] text-gray-500">v0.2.0</span>
      </div>

      <div class="flex items-center space-x-3">
        {/* Error */}
        <Show when={ctx.state().error}>
          <span class="text-[10px] text-red-400 truncate max-w-[300px]" title={ctx.state().error!}>
            ⚠ {ctx.state().error}
          </span>
        </Show>

        <button onClick={props.onToggleCs}
          class={`text-[10px] px-2 py-1 rounded transition-colors ${props.csVisible() ? "text-emerald-400 bg-[#1a2e22]" : "text-gray-500 hover:text-gray-300 hover:bg-gray-700"}`}
          title="切换剖面图显示">
          ▥ 剖面
        </button>

        <button onClick={ctx.resetParams} class="text-[10px] text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
          重置
        </button>

        {/* Toggle right sidebar */}
        <button onClick={props.onToggleRight} class={`p-1.5 rounded transition-colors ${props.rightOpen() ? "text-emerald-400 hover:bg-gray-700" : "text-gray-500 hover:bg-gray-700"}`} title="切换结果面板">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default Header;

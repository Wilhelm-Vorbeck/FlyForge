import { Component, Show } from "solid-js";
import { useAppContext } from "../store";

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: Component<HeaderProps> = (props) => {
  const ctx = useAppContext();

  return (
    <header class="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between flex-shrink-0">
      {/* Left */}
      <div class="flex items-center space-x-3">
        <button onClick={props.onToggleSidebar} class="p-1.5 rounded hover:bg-gray-700 transition-colors" title="切换侧边栏">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div class="flex items-center space-x-2">
          <div class="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" stroke-width="2" />
              <circle cx="12" cy="12" r="3" stroke-width="2" />
              <line x1="12" y1="3" x2="12" y2="9" stroke-width="2" />
            </svg>
          </div>
          <div>
            <h1 class="text-sm font-bold leading-tight">FlyForge</h1>
            <p class="text-[10px] text-gray-400 leading-tight">飞轮设计及运动学模拟</p>
          </div>
        </div>
      </div>

      {/* Right */}
      <div class="flex items-center space-x-3">
        <Show when={ctx.state().isLoading}>
          <div class="flex items-center space-x-1.5 text-blue-400">
            <svg class="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <span class="text-xs">计算中</span>
          </div>
        </Show>
        <Show when={ctx.state().error}>
          <span class="text-xs text-red-400 truncate max-w-[200px]">⚠ {ctx.state().error}</span>
        </Show>
        <button onClick={ctx.resetParams} class="text-xs text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700 transition-colors">
          重置
        </button>
      </div>
    </header>
  );
};

export default Header;

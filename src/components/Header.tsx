import { Component } from "solid-js";
import { useAppContext } from "../store";

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: Component<HeaderProps> = (props) => {
  const context = useAppContext();

  return (
    <header class="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        {/* Sidebar toggle button */}
        <button
          onClick={props.onToggleSidebar}
          class="p-2 rounded-lg hover:bg-gray-700 transition-colors"
          title="切换侧边栏"
        >
          <svg
            class="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* Logo and title */}
        <div class="flex items-center space-x-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg
              class="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <div>
            <h1 class="text-lg font-bold text-white">FlyForge</h1>
            <p class="text-xs text-gray-400">飞轮设计及运动学模拟</p>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-4">
        {/* Loading indicator */}
        {context.state().isLoading && (
          <div class="flex items-center space-x-2 text-blue-400">
            <svg
              class="animate-spin h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span class="text-sm">计算中...</span>
          </div>
        )}

        {/* Error indicator */}
        {context.state().error && (
          <div class="text-red-400 text-sm">
            ⚠️ {context.state().error}
          </div>
        )}

        {/* Reset button */}
        <button
          onClick={context.resetParams}
          class="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
        >
          重置参数
        </button>
      </div>
    </header>
  );
};

export default Header;

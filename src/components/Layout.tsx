import { Component, createSignal } from "solid-js";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import Header from "./Header";

const Layout: Component = () => {
  const [sidebarOpen, setSidebarOpen] = createSignal(true);

  return (
    <div class="flex h-screen overflow-hidden bg-gray-900 text-white">
      {/* Sidebar */}
      <aside
        class={`${
          sidebarOpen() ? "w-72" : "w-0"
        } flex-shrink-0 transition-all duration-300 overflow-hidden bg-gray-800 border-r border-gray-700`}
      >
        <Sidebar />
      </aside>

      {/* Main content area */}
      <div class="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen())} />
        <div class="flex-1 overflow-auto">
          <MainContent />
        </div>
      </div>
    </div>
  );
};

export default Layout;

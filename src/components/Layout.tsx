import { Component, createSignal } from "solid-js";
import { useAppContext } from "../store";
import Sidebar from "./Sidebar";
import MainContent from "./MainContent";
import Header from "./Header";

const Layout: Component = () => {
  const [sidebarOpen, setSidebarOpen] = createSignal(true);
  const context = useAppContext();

  return (
    <div class="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div
        class={`${
          sidebarOpen() ? "w-80" : "w-0"
        } transition-all duration-300 overflow-hidden bg-gray-800 border-r border-gray-700`}
      >
        <Sidebar />
      </div>

      {/* Main content area */}
      <div class="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen())} />

        {/* Main content */}
        <div class="flex-1 overflow-auto">
          <MainContent />
        </div>
      </div>
    </div>
  );
};

export default Layout;

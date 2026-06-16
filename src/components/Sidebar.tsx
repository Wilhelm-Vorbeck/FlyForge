import { Component, createSignal } from "solid-js";
import { useAppContext } from "../store";
import { FlywheelType, FlywheelTypeNames } from "../types";
import GeometryTab from "./tabs/GeometryTab";
import MaterialTab from "./tabs/MaterialTab";
import OperatingTab from "./tabs/OperatingTab";

type TabId = "geometry" | "material" | "operating";

const Sidebar: Component = () => {
  const [activeTab, setActiveTab] = createSignal<TabId>("geometry");
  const context = useAppContext();

  const tabs = [
    { id: "geometry" as TabId, label: "几何参数", icon: "M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" },
    { id: "material" as TabId, label: "材料选择", icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" },
    { id: "operating" as TabId, label: "工况参数", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
  ];

  return (
    <div class="h-full flex flex-col">
      {/* Tab navigation */}
      <div class="flex border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            onClick={() => setActiveTab(tab.id)}
            class={`flex-1 px-3 py-3 text-sm font-medium flex flex-col items-center space-y-1 transition-colors ${
              activeTab() === tab.id
                ? "text-blue-400 border-b-2 border-blue-400 bg-gray-700"
                : "text-gray-400 hover:text-white hover:bg-gray-700"
            }`}
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
                d={tab.icon}
              />
            </svg>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div class="flex-1 overflow-auto p-4">
        {activeTab() === "geometry" && <GeometryTab />}
        {activeTab() === "material" && <MaterialTab />}
        {activeTab() === "operating" && <OperatingTab />}
      </div>

      {/* Flywheel type selector */}
      <div class="border-t border-gray-700 p-4">
        <label class="block text-sm font-medium text-gray-300 mb-2">
          飞轮类型
        </label>
        <select
          value={context.state().params.flywheel_type}
          onChange={(e) =>
            context.setParams({
              flywheel_type: parseInt(e.target.value) as FlywheelType,
            })
          }
          class="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {Object.entries(FlywheelTypeNames).map(([value, names]) => (
            <option value={value}>{names.zh}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Sidebar;

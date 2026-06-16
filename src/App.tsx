import { Component, createSignal } from "solid-js";
import { FlywheelType, FlywheelParams, Material } from "./types";

const App: Component = () => {
  const [params, setParams] = createSignal<FlywheelParams>({
    r_o: 200.0,
    r_i: 40.0,
    thickness: 50.0,
    r_hub: 60.0,
    hub_thickness: 80.0,
    rpm_rated: 3000.0,
    rpm_max: 4500.0,
    rpm_min: 1500.0,
    n_points: 100,
    flywheel_type: FlywheelType.AnnularRing,
    material_id: "aisi_4340",
    safety_factor_yield: 1.5,
    safety_factor_fatigue: 1.5,
    safety_factor_burst: 2.0,
  });

  return (
    <div class="container mx-auto p-4">
      <h1 class="text-3xl font-bold mb-6">FlyForge - 飞轮设计及运动学模拟</h1>
      <div class="bg-gray-800 rounded-lg p-6">
        <p class="text-lg">项目初始化完成</p>
        <p class="text-gray-400 mt-2">版本: v0.1.0 - 基础架构</p>
      </div>
    </div>
  );
};

export default App;
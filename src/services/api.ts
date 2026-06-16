import { invoke } from "@tauri-apps/api/core";
import { FlywheelParams, FlywheelSimulation, Material } from "../types";

/**
 * Get app info from backend
 */
export async function getAppInfo(): Promise<{ name: string; version: string }> {
  return await invoke("get_app_info");
}

/**
 * Get all built-in materials
 */
export async function getMaterials(): Promise<Material[]> {
  return await invoke("get_materials");
}

/**
 * Get available flywheel types
 */
export async function getFlywheelTypes(): Promise<string[]> {
  return await invoke("get_flywheel_types");
}

/**
 * Run flywheel simulation
 */
export async function runSimulation(
  params: FlywheelParams
): Promise<FlywheelSimulation> {
  return await invoke("run_simulation", { params });
}

/**
 * Run simulation with error handling and loading state
 */
export async function runSimulationWithState(
  params: FlywheelParams,
  setLoading: (loading: boolean) => void,
  setError: (error: string | null) => void,
  setSimulation: (sim: FlywheelSimulation | null) => void
): Promise<void> {
  setLoading(true);
  setError(null);

  try {
    const result = await runSimulation(params);
    setSimulation(result);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    setError(errorMsg);
    setSimulation(null);
  } finally {
    setLoading(false);
  }
}

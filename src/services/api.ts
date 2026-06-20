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

/**
 * Export simulation result to CSV
 */
export async function exportSimulationCsv(sim: FlywheelSimulation): Promise<string> {
  return await invoke("export_simulation_csv", { sim });
}

/**
 * Export simulation result to JSON
 */
export async function exportSimulationJson(sim: FlywheelSimulation): Promise<string> {
  return await invoke("export_simulation_json", { sim });
}

/**
 * Export simulation result to SVG (stress chart)
 */
export async function exportSimulationSvg(sim: FlywheelSimulation): Promise<string> {
  return await invoke("export_simulation_svg", { sim });
}

/**
 * Export parameters to JSON
 */
export async function exportParams(params: FlywheelParams): Promise<string> {
  return await invoke("export_params", { params });
}

/**
 * Import parameters from JSON
 */
export async function importParams(json: string): Promise<FlywheelParams> {
  return await invoke("import_params", { json });
}

/**
 * Get fatigue life estimation
 */
export async function getFatigueEstimate(sim: FlywheelSimulation, criterion?: string): Promise<{
  stress_amplitude: number;
  cycles: number;
  years: number;
  safety_margin: number;
  infinite_life: boolean;
  life_description: string;
}> {
  return await invoke("get_fatigue_estimate", { sim, criterion });
}

/**
 * Run parameter sensitivity sweep
 */
export async function runSensitivitySweep(
  params: FlywheelParams,
  material: Material,
  sweepParam: string,
  sweepMetric: string,
  from: number,
  to: number,
  numPoints: number,
): Promise<{
  points: { param_value: number; metric_value: number }[];
  param_name: string;
  param_unit: string;
  metric_name: string;
  metric_unit: string;
  base_metric_value: number;
}> {
  return await invoke("run_sensitivity_sweep", {
    params,
    material,
    sweepParam,
    sweepMetric,
    from,
    to,
    numPoints,
  });
}

/**
 * Compute thermal stress distribution
 */
export async function computeThermalStress(
  params: FlywheelParams,
  material: Material,
): Promise<{
  r: number[];
  sigma_vm: number[];
  sigma_vm_cent: number[];
  sigma_vm_therm: number[];
  corrected_yield: number;
  max_stress: number;
  max_stress_location: number;
}> {
  return await invoke("compute_thermal_stress", { params, material });
}

/**
 * Get S-N curve data
 */
export async function getSNCurve(material: Material, operatingStress: number): Promise<{
  curve: { cycles: number; stress_amplitude: number }[];
  fatigue_limit: number;
  operating_stress: number;
  operating_cycles: number;
  material_name: string;
}> {
  return await invoke("get_sn_curve", { material, operatingStress });
}

// FlyForge TypeScript Type Definitions
// Keep in sync with Rust types.rs

/**
 * Flywheel geometry type enum
 * Serialized as integer, consistent with Rust enum
 */
export enum FlywheelType {
  SolidDisk = 1,
  AnnularRing = 2,
  TaperedDisk = 3,
  ConstantStrength = 4,
  MultiLayerComposite = 5,
}

export const FlywheelTypeNames: Record<FlywheelType, { zh: string; en: string }> = {
  [FlywheelType.SolidDisk]: { zh: "实心圆盘", en: "Solid Disk" },
  [FlywheelType.AnnularRing]: { zh: "环形轮（等厚度）", en: "Annular Ring" },
  [FlywheelType.TaperedDisk]: { zh: "锥形盘", en: "Tapered Disk" },
  [FlywheelType.ConstantStrength]: { zh: "等强度轮", en: "Constant Strength" },
  [FlywheelType.MultiLayerComposite]: { zh: "多层复合轮", en: "Multi-Layer Composite" },
};

/**
 * Material properties interface
 */
export interface Material {
  name: string;
  name_zh: string;
  density: number; // kg/m³
  young_modulus: number; // GPa
  poisson_ratio: number;
  yield_strength: number; // MPa
  tensile_strength: number; // MPa
  fatigue_limit: number; // MPa
  specific_strength: number; // MPa·m³/kg
  thermal_expansion: number; // 10⁻⁶ / K (CTE)
  reference_temperature: number; // °C
}

/**
 * Multi-layer composite layer configuration
 */
export interface LayerConfig {
  material_id: string;
  thickness: number; // mm
  outer_radius: number; // mm — outer boundary of this layer
}

/**
 * Flywheel design parameters interface
 */
export interface FlywheelParams {
  r_o: number; // Outer radius (mm)
  r_i: number; // Inner radius (mm)
  thickness: number; // Rim thickness (mm)
  r_hub: number; // Hub outer radius (mm)
  hub_thickness: number; // Hub thickness (mm)
  rpm_rated: number; // Rated speed (rpm)
  rpm_max: number; // Maximum speed (rpm)
  rpm_min: number; // Minimum speed (rpm)
  n_points: number; // Number of radial discretization points
  flywheel_type: FlywheelType;
  material_id: string;
  operating_temperature?: number; // °C, default 20
  safety_factor_yield: number;
  safety_factor_fatigue: number;
  safety_factor_burst: number;
  layer_configs?: LayerConfig[]; // Multi-layer composite only
}

/**
 * Stress distribution interface
 */
export interface StressDistribution {
  r: number[]; // Radial coordinates (mm)
  sigma_r: number[]; // Radial stress (MPa)
  sigma_h: number[]; // Hoop stress (MPa)
  sigma_vm: number[]; // von Mises equivalent stress (MPa)
}

/**
 * Complete simulation results interface
 */
export interface FlywheelSimulation {
  params: FlywheelParams;
  material: Material;
  mass: number; // kg
  moment_of_inertia: number; // kg·m²
  stress_rated: StressDistribution;
  max_stress_rated: number; // MPa
  max_stress_location: number; // mm
  rpm_yield: number; // rpm
  rpm_burst: number; // rpm
  rpm_burst_safe: number; // rpm
  energy_rated: number; // kJ
  energy_max: number; // kJ
  energy_usable: number; // kJ
  specific_energy: number; // Wh/kg
  specific_power: number; // W/kg
  speed_fluctuation: number;
  rpm_curve: number[];
  time_curve: number[];
  actual_safety_yield: number;
  actual_safety_fatigue: number;
  safety_passed: boolean;
  safety_warnings: string[];
}

/**
 * Display options interface
 */
export interface DisplayOptions {
  showStressHeatmap: boolean;
  showGeometrySection: boolean;
  showRpmCurve: boolean;
  showEnergyBar: boolean;
  showSafetyIndicator: boolean;
  showGridLines: boolean;
  showAnnotations: boolean;
}
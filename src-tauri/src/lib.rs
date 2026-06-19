use flyforge_core::export::{export_csv, export_json, export_svg_stress, export_params_json, import_params_json};
use flyforge_core::fatigue::{estimate_fatigue_life, sn_curve};
use flyforge_core::sensitivity::{run_sweep, SweepParam, SweepMetric, SensitivityPoint};
use flyforge_core::thermal::{thermal_stress_annular, temperature_corrected_yield, combine_stress};
use flyforge_core::solver::SolverRegistry;
use flyforge_core::types::{FlywheelParams, FlywheelSimulation, Material, materials};
use serde::{Deserialize, Serialize};
use std::fs;

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FatigueResultDto {
    pub stress_amplitude: f64,
    pub cycles: f64,
    pub years: f64,
    pub safety_margin: f64,
    pub infinite_life: bool,
    pub life_description: String,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "FlyForge".to_string(),
        version: "0.2.0".to_string(),
    }
}

#[tauri::command]
fn get_materials() -> Vec<Material> {
    materials::all()
}

#[tauri::command]
fn get_flywheel_types() -> Vec<String> {
    vec![
        "SolidDisk".to_string(),
        "AnnularRing".to_string(),
        "TaperedDisk".to_string(),
        "ConstantStrength".to_string(),
        "MultiLayerComposite".to_string(),
    ]
}

#[tauri::command]
fn run_simulation(params: FlywheelParams) -> Result<FlywheelSimulation, String> {
    let registry = SolverRegistry::new();
    let material = materials::find_by_id(&params.material_id)
        .unwrap_or_else(|| materials::default_material());
    registry.simulate(&params, &material)
}

#[tauri::command]
fn export_simulation_csv(sim: FlywheelSimulation) -> String {
    export_csv(&sim)
}

#[tauri::command]
fn export_simulation_json(sim: FlywheelSimulation) -> Result<String, String> {
    export_json(&sim)
}

#[tauri::command]
fn export_simulation_svg(sim: FlywheelSimulation) -> String {
    export_svg_stress(&sim)
}

#[tauri::command]
fn export_params(params: FlywheelParams) -> Result<String, String> {
    export_params_json(&params)
}

#[tauri::command]
fn import_params(json: String) -> Result<FlywheelParams, String> {
    import_params_json(&json)
}

#[tauri::command]
fn save_file_content(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|e| format!("保存文件失败: {}", e))
}

#[tauri::command]
fn get_fatigue_estimate(sim: FlywheelSimulation) -> FatigueResultDto {
    let mat = &sim.material;
    let max_vm = sim.max_stress_rated;
    let mean_stress = max_vm * 0.3; // approximate mean stress as 30% of max
    let result = estimate_fatigue_life(mat, max_vm, mean_stress);
    FatigueResultDto {
        stress_amplitude: result.stress_amplitude,
        cycles: result.cycles,
        years: result.years,
        safety_margin: result.safety_margin,
        infinite_life: result.infinite_life,
        life_description: result.life_description,
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SensitivityPointDto {
    pub param_value: f64,
    pub metric_value: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SensitivityResultDto {
    pub points: Vec<SensitivityPointDto>,
    pub param_name: String,
    pub param_unit: String,
    pub metric_name: String,
    pub metric_unit: String,
    pub base_metric_value: f64,
}

#[tauri::command]
fn run_sensitivity_sweep(
    params: FlywheelParams,
    material: Material,
    sweep_param: String,
    sweep_metric: String,
    from: f64,
    to: f64,
    num_points: usize,
) -> Result<SensitivityResultDto, String> {
    let param: SweepParam = match sweep_param.as_str() {
        "r_o" => SweepParam::OuterRadius,
        "r_i" => SweepParam::InnerRadius,
        "thickness" => SweepParam::Thickness,
        "r_hub" => SweepParam::HubRadius,
        "hub_thickness" => SweepParam::HubThickness,
        "rpm_rated" => SweepParam::RatedRpm,
        "rpm_max" => SweepParam::MaxRpm,
        _ => return Err(format!("Unknown sweep parameter: {}", sweep_param)),
    };

    let metric = match sweep_metric.as_str() {
        "max_stress" => SweepMetric::MaxStress,
        "mass" => SweepMetric::Mass,
        "inertia" => SweepMetric::Inertia,
        "energy_rated" => SweepMetric::EnergyRated,
        "energy_usable" => SweepMetric::EnergyUsable,
        "specific_energy" => SweepMetric::SpecificEnergy,
        "safety_yield" => SweepMetric::SafetyYield,
        "safety_fatigue" => SweepMetric::SafetyFatigue,
        _ => return Err(format!("Unknown sweep metric: {}", sweep_metric)),
    };

    let result = run_sweep(&params, &material, param, metric, from, to, num_points);

    Ok(SensitivityResultDto {
        points: result.points.into_iter().map(|p| SensitivityPointDto {
            param_value: p.param_value,
            metric_value: p.metric_value,
        }).collect(),
        param_name: result.param_name,
        param_unit: result.param_unit,
        metric_name: result.metric_name,
        metric_unit: result.metric_unit,
        base_metric_value: result.base_metric_value,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ThermalStressDto {
    pub r: Vec<f64>,         // radial coordinates (mm)
    pub sigma_vm: Vec<f64>,  // combined von Mises stress (MPa)
    pub sigma_vm_cent: Vec<f64>, // centrifugal only (MPa)
    pub sigma_vm_therm: Vec<f64>, // thermal only (MPa)
    pub corrected_yield: f64, // temperature-corrected yield strength (MPa)
    pub max_stress: f64,
    pub max_stress_location: f64,
}

#[tauri::command]
fn compute_thermal_stress(
    params: FlywheelParams,
    material: Material,
) -> Result<ThermalStressDto, String> {
    let temp = params.operating_temperature;
    let corrected_yield = temperature_corrected_yield(&material, temp);

    // Generate radial points same as stress module
    let n = params.n_points;
    let r_m: Vec<f64> = (0..n)
        .map(|i| (params.r_i + (params.r_o - params.r_i) * i as f64 / (n as f64 - 1.0)) / 1000.0)
        .collect();

    let registry = SolverRegistry::new();

    // Get centrifugal stress first
    let sim = registry.simulate(&params, &material)?;

    // Compute thermal stress
    // Assume typical flywheel gradient: inner hotter (bore), outer cooler
    let temp_inner = temp + 10.0; // slight heating at bore
    let temp_outer = temp - 5.0;  // slight cooling at rim
    let (sigma_r_th, sigma_h_th) = thermal_stress_annular(&r_m, &params, &material, temp_inner, temp_outer);

    // Combine stresses
    let combined = combine_stress(&sim.stress_rated, &sigma_r_th, &sigma_h_th);

    // Thermal-only von Mises
    let n_pts = combined.r.len();
    let mut sigma_vm_therm_only = vec![0.0; n_pts];
    for i in 0..n_pts {
        let sr = sigma_r_th[i] / 1e6;
        let sh = sigma_h_th[i] / 1e6;
        sigma_vm_therm_only[i] = (sr * sr + sh * sh - sr * sh).sqrt();
    }

    let max_idx = combined.sigma_vm.iter().enumerate()
        .fold((0usize, f64::NEG_INFINITY), |(mi, mv), (i, &v)| if v > mv { (i, v) } else { (mi, mv) });

    Ok(ThermalStressDto {
        r: combined.r.clone(),
        sigma_vm: combined.sigma_vm,
        sigma_vm_cent: sim.stress_rated.sigma_vm.clone(),
        sigma_vm_therm: sigma_vm_therm_only,
        corrected_yield,
        max_stress: combined.sigma_vm[max_idx],
        max_stress_location: combined.r[max_idx],
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SNCurvePointDto {
    pub cycles: f64,
    pub stress_amplitude: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SNCurveDto {
    pub curve: Vec<SNCurvePointDto>,
    pub fatigue_limit: f64,
    pub operating_stress: f64,
    pub operating_cycles: f64,
    pub material_name: String,
}

#[tauri::command]
fn get_sn_curve(material: Material, operating_stress: f64) -> SNCurveDto {
    let data = sn_curve(&material, operating_stress);
    SNCurveDto {
        curve: data.curve.into_iter().map(|p| SNCurvePointDto {
            cycles: p.cycles,
            stress_amplitude: p.stress_amplitude,
        }).collect(),
        fatigue_limit: data.fatigue_limit,
        operating_stress: data.operating_stress,
        operating_cycles: data.operating_cycles,
        material_name: data.material_name,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_materials,
            get_flywheel_types,
            run_simulation,
            export_simulation_csv,
            export_simulation_json,
            export_simulation_svg,
            export_params,
            import_params,
            save_file_content,
            get_fatigue_estimate,
            run_sensitivity_sweep,
            compute_thermal_stress,
            get_sn_curve,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

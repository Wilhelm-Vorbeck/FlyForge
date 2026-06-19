use flyforge_core::export::{export_csv, export_json, export_svg_stress, export_params_json, import_params_json};
use flyforge_core::fatigue::estimate_fatigue_life;
use flyforge_core::sensitivity::{run_sweep, SweepParam, SweepMetric, SensitivityPoint};
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

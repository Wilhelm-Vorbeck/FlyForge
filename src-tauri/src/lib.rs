use flyforge_core::export::{export_csv, export_json, export_svg_stress, export_params_json, import_params_json};
use flyforge_core::fatigue::estimate_fatigue_life;
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

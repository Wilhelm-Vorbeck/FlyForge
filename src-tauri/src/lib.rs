use flyforge_core::solver::SolverRegistry;
use flyforge_core::types::{FlywheelParams, FlywheelSimulation, Material, materials};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
}

#[tauri::command]
fn get_app_info() -> AppInfo {
    AppInfo {
        name: "FlyForge".to_string(),
        version: "0.7.0".to_string(),
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_app_info,
            get_materials,
            get_flywheel_types,
            run_simulation
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
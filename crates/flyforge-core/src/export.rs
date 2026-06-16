//! Export Module
//!
//! Export simulation results to various formats: CSV, JSON, SVG.
//!
//! Reference: 项目记忆文件 - 八、完整功能需求 (8.1 基础导出格式)

use crate::types::{FlywheelParams, FlywheelSimulation};
use serde::{Deserialize, Serialize};

/// Export format enum
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ExportFormat {
    Csv,
    Json,
    Svg,
}

/// Export configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportConfig {
    pub format: ExportFormat,
    pub include_stress: bool,
    pub include_energy: bool,
    pub include_safety: bool,
    pub include_curves: bool,
}

impl Default for ExportConfig {
    fn default() -> Self {
        Self {
            format: ExportFormat::Json,
            include_stress: true,
            include_energy: true,
            include_safety: true,
            include_curves: true,
        }
    }
}

/// Export simulation result to CSV format
pub fn export_csv(sim: &FlywheelSimulation) -> String {
    let mut csv = String::new();

    // Header section
    csv.push_str("# FlyForge Simulation Result\n");
    csv.push_str(&format!("# Flywheel Type: {:?}\n", sim.params.flywheel_type));
    csv.push_str(&format!("# Material: {}\n", sim.material.name));
    csv.push_str("\n");

    // Parameters section
    csv.push_str("## Parameters\n");
    csv.push_str(&format!("outer_radius_mm,{}\n", sim.params.r_o));
    csv.push_str(&format!("inner_radius_mm,{}\n", sim.params.r_i));
    csv.push_str(&format!("thickness_mm,{}\n", sim.params.thickness));
    csv.push_str(&format!("rated_speed_rpm,{}\n", sim.params.rpm_rated));
    csv.push_str(&format!("max_speed_rpm,{}\n", sim.params.rpm_max));
    csv.push_str(&format!("min_speed_rpm,{}\n", sim.params.rpm_min));
    csv.push_str("\n");

    // Results section
    csv.push_str("## Results\n");
    csv.push_str(&format!("mass_kg,{:.4}\n", sim.mass));
    csv.push_str(&format!("moment_of_inertia_kg_m2,{:.6}\n", sim.moment_of_inertia));
    csv.push_str(&format!("max_stress_rated_mpa,{:.2}\n", sim.max_stress_rated));
    csv.push_str(&format!("energy_rated_kj,{:.2}\n", sim.energy_rated));
    csv.push_str(&format!("energy_usable_kj,{:.2}\n", sim.energy_usable));
    csv.push_str(&format!("specific_energy_wh_kg,{:.2}\n", sim.specific_energy));
    csv.push_str(&format!("safety_yield,{:.2}\n", sim.actual_safety_yield));
    csv.push_str(&format!("safety_fatigue,{:.2}\n", sim.actual_safety_fatigue));
    csv.push_str(&format!("rpm_burst_safe,{}\n", sim.rpm_burst_safe));
    csv.push_str("\n");

    // Stress distribution
    csv.push_str("## Stress Distribution\n");
    csv.push_str("r_mm,sigma_r_mpa,sigma_h_mpa,sigma_vm_mpa\n");
    for i in 0..sim.stress_rated.r.len() {
        csv.push_str(&format!(
            "{:.2},{:.2},{:.2},{:.2}\n",
            sim.stress_rated.r[i],
            sim.stress_rated.sigma_r[i],
            sim.stress_rated.sigma_h[i],
            sim.stress_rated.sigma_vm[i]
        ));
    }
    csv.push_str("\n");

    // RPM curve
    csv.push_str("## RPM-Time Curve\n");
    csv.push_str("time_s,rpm\n");
    for i in 0..sim.time_curve.len() {
        csv.push_str(&format!("{:.4},{:.2}\n", sim.time_curve[i], sim.rpm_curve[i]));
    }

    csv
}

/// Export simulation result to JSON format
pub fn export_json(sim: &FlywheelSimulation) -> Result<String, String> {
    serde_json::to_string_pretty(sim).map_err(|e| format!("JSON serialization error: {}", e))
}

/// Export simulation result to SVG format (stress distribution chart)
pub fn export_svg_stress(sim: &FlywheelSimulation) -> String {
    let width = 800;
    let height = 400;
    let padding = 60;

    let stress = &sim.stress_rated;
    if stress.r.is_empty() {
        return "<svg></svg>".to_string();
    }

    let max_r = stress.r.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let max_stress = stress.sigma_vm.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

    let x_scale = |r: f64| padding as f64 + (r / max_r) * (width - 2 * padding) as f64;
    let y_scale = |s: f64| height as f64 - padding as f64 - (s / max_stress) * (height - 2 * padding) as f64;

    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {} {}" width="{}" height="{}">
  <style>
    .axis {{ stroke: #666; stroke-width: 1; }}
    .grid {{ stroke: #eee; stroke-width: 0.5; }}
    .vm {{ stroke: #e74c3c; stroke-width: 2; fill: none; }}
    .hoop {{ stroke: #3498db; stroke-width: 2; fill: none; }}
    .radial {{ stroke: #2ecc71; stroke-width: 2; fill: none; }}
    .label {{ font-family: Arial; font-size: 12px; fill: #666; }}
    .title {{ font-family: Arial; font-size: 16px; fill: #333; font-weight: bold; }}
  </style>
  <rect width="{}" height="{}" fill="white"/>
  <text x="{}" y="30" class="title">FlyForge - Stress Distribution</text>
"#,
        width, height, width, height, width, height, padding
    );

    // Grid lines
    for i in 0..=5 {
        let y = padding as f64 + i as f64 * (height - 2 * padding) as f64 / 5.0;
        svg.push_str(&format!(
            r#"  <line x1="{}" y1="{}" x2="{}" y2="{}" class="grid"/>
"#,
            padding, y as i32, width - padding, y as i32
        ));
    }

    // Axes
    svg.push_str(&format!(
        r#"  <line x1="{}" y1="{}" x2="{}" y2="{}" class="axis"/>
  <line x1="{}" y1="{}" x2="{}" y2="{}" class="axis"/>
"#,
        padding, padding, padding, height - padding,
        padding, height - padding, width - padding, height - padding
    ));

    // Stress curves
    let vm_path: String = stress.r.iter().enumerate()
        .map(|(i, &r)| {
            let cmd = if i == 0 { "M" } else { "L" };
            format!("{}{:.1},{:.1}", cmd, x_scale(r), y_scale(stress.sigma_vm[i]))
        })
        .collect::<Vec<_>>()
        .join(" ");

    let hoop_path: String = stress.r.iter().enumerate()
        .map(|(i, &r)| {
            let cmd = if i == 0 { "M" } else { "L" };
            format!("{}{:.1},{:.1}", cmd, x_scale(r), y_scale(stress.sigma_h[i]))
        })
        .collect::<Vec<_>>()
        .join(" ");

    let radial_path: String = stress.r.iter().enumerate()
        .map(|(i, &r)| {
            let cmd = if i == 0 { "M" } else { "L" };
            format!("{}{:.1},{:.1}", cmd, x_scale(r), y_scale(stress.sigma_r[i]))
        })
        .collect::<Vec<_>>()
        .join(" ");

    svg.push_str(&format!(
        r#"  <path d="{}" class="vm"/>
  <path d="{}" class="hoop"/>
  <path d="{}" class="radial"/>
"#,
        vm_path, hoop_path, radial_path
    ));

    // Labels
    svg.push_str(&format!(
        r#"  <text x="{}" y="{}" class="label">0</text>
  <text x="{}" y="{}" class="label">{:.0} mm</text>
  <text x="{}" y="{}" class="label">{:.0} MPa</text>
  <text x="{}" y="{}" class="label">0</text>
"#,
        padding - 5, height - padding + 20,
        width - padding - 30, height - padding + 20, max_r,
        10, padding + 5, max_stress,
        10, height - padding + 5
    ));

    // Legend
    let legend_x = width - 180;
    let legend_y = padding + 20;
    svg.push_str(&format!(
        "  <rect x=\"{}\" y=\"{}\" width=\"160\" height=\"80\" fill=\"white\" stroke=\"#ccc\"/>\n",
        legend_x, legend_y
    ));
    svg.push_str(&format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" class=\"vm\"/>\n",
        legend_x + 10, legend_y + 20, legend_x + 30, legend_y + 20
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\">von Mises</text>\n",
        legend_x + 35, legend_y + 24
    ));
    svg.push_str(&format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" class=\"hoop\"/>\n",
        legend_x + 10, legend_y + 40, legend_x + 30, legend_y + 40
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\">Hoop Stress</text>\n",
        legend_x + 35, legend_y + 44
    ));
    svg.push_str(&format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" class=\"radial\"/>\n",
        legend_x + 10, legend_y + 60, legend_x + 30, legend_y + 60
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\">Radial Stress</text>\n",
        legend_x + 35, legend_y + 64
    ));

    svg.push_str("</svg>");
    svg
}

/// Export flywheel parameters to JSON (for import)
pub fn export_params_json(params: &FlywheelParams) -> Result<String, String> {
    serde_json::to_string_pretty(params).map_err(|e| format!("JSON serialization error: {}", e))
}

/// Import flywheel parameters from JSON
pub fn import_params_json(json: &str) -> Result<FlywheelParams, String> {
    serde_json::from_str(json).map_err(|e| format!("JSON parse error: {}", e))
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::solver::SolverRegistry;
    use crate::types::{FlywheelParams, materials};

    fn create_test_simulation() -> FlywheelSimulation {
        let registry = SolverRegistry::new();
        let params = FlywheelParams::default();
        let material = materials::aisi_4340_steel();
        registry.simulate(&params, &material).unwrap()
    }

    #[test]
    fn test_export_csv() {
        let sim = create_test_simulation();
        let csv = export_csv(&sim);

        assert!(csv.contains("# FlyForge Simulation Result"));
        assert!(csv.contains("mass_kg,"));
        assert!(csv.contains("r_mm,sigma_r_mpa,sigma_h_mpa,sigma_vm_mpa"));
        assert!(csv.contains("time_s,rpm"));
    }

    #[test]
    fn test_export_json() {
        let sim = create_test_simulation();
        let json = export_json(&sim);

        assert!(json.is_ok());
        let json_str = json.unwrap();
        assert!(json_str.contains("\"mass\""));
        assert!(json_str.contains("\"moment_of_inertia\""));
    }

    #[test]
    fn test_export_svg_stress() {
        let sim = create_test_simulation();
        let svg = export_svg_stress(&sim);

        assert!(svg.contains("<svg"));
        assert!(svg.contains("FlyForge - Stress Distribution"));
        assert!(svg.contains("von Mises"));
    }

    #[test]
    fn test_export_import_params() {
        let params = FlywheelParams::default();
        let json = export_params_json(&params).unwrap();
        let imported = import_params_json(&json).unwrap();

        assert_eq!(params.r_o, imported.r_o);
        assert_eq!(params.r_i, imported.r_i);
        assert_eq!(params.rpm_rated, imported.rpm_rated);
    }

    #[test]
    fn test_import_invalid_json() {
        let result = import_params_json("invalid json");
        assert!(result.is_err());
    }
}

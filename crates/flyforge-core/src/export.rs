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

/// Simple HTML escape for user-facing strings
fn html_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Get current timestamp as a formatted string (no external deps)
fn current_timestamp_str() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let Ok(dur) = SystemTime::now().duration_since(UNIX_EPOCH) else {
        return "N/A".to_string();
    };
    let total_secs = dur.as_secs();
    let days = (total_secs / 86400) as i64;
    let tod = total_secs % 86400;
    let h = tod / 3600;
    let m = (tod % 3600) / 60;
    let s = tod % 60;

    // Civil calendar from days-since-epoch (Howard Hinnant algorithm)
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u64;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let mo: i64 = if mp < 10 { mp as i64 + 3 } else { mp as i64 - 9 };
    let yr = if mo <= 2 { y + 1 } else { y };

    format!("{:04}-{:02}-{:02} {:02}:{:02}:{:02} UTC", yr, mo, d, h, m, s)
}

/// Build inline SVG stress distribution chart for the HTML report (dark theme variant)
fn build_stress_svg_html(sim: &FlywheelSimulation) -> String {
    let width = 800;
    let height = 400;
    let padding = 70;

    let stress = &sim.stress_rated;
    if stress.r.is_empty() {
        return String::new();
    }

    let max_r = stress.r.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    let max_stress = stress
        .sigma_vm
        .iter()
        .cloned()
        .fold(f64::NEG_INFINITY, f64::max)
        .max(
            stress
                .sigma_h
                .iter()
                .cloned()
                .fold(f64::NEG_INFINITY, f64::max),
        )
        .max(
            stress
                .sigma_r
                .iter()
                .cloned()
                .fold(f64::NEG_INFINITY, f64::max),
        )
        * 1.05; // 5% headroom

    let x_scale = |r: f64| padding as f64 + (r / max_r) * (width - 2 * padding) as f64;
    let y_scale =
        |s: f64| height as f64 - padding as f64 - (s / max_stress) * (height - 2 * padding) as f64;

    let mut svg = format!(
        r#"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" style="max-width:{w}px">
  <style>
    .chart-bg {{ fill: #0d1520; }}
    .axis {{ stroke: #374151; stroke-width: 1.5; }}
    .grid {{ stroke: #1f2937; stroke-width: 0.5; stroke-dasharray: 4 4; }}
    .vm {{ stroke: #f87171; stroke-width: 2.5; fill: none; }}
    .hoop {{ stroke: #60a5fa; stroke-width: 2.5; fill: none; }}
    .radial {{ stroke: #34d399; stroke-width: 2.5; fill: none; }}
    .label {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; fill: #9ca3af; }}
    .title {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 15px; fill: #e5e7eb; font-weight: 600; }}
    .legend-box {{ fill: #111827; stroke: #374151; }}
    .legend-text {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; fill: #d1d5db; }}
  </style>
  <rect class="chart-bg" width="{w}" height="{h}" rx="8"/>
  <text x="{p}" y="30" class="title">应力分布 (额定转速)</text>
"#,
        w = width,
        h = height,
        p = padding
    );

    // Grid lines
    for i in 0..=5 {
        let y = padding as f64 + i as f64 * (height - 2 * padding) as f64 / 5.0;
        svg.push_str(&format!(
            "  <line x1=\"{}\" y1=\"{:.0}\" x2=\"{}\" y2=\"{:.0}\" class=\"grid\"/>\n",
            padding, y, width - padding, y
        ));
    }

    // Axes
    svg.push_str(&format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" class=\"axis\"/>\n",
        padding, padding, padding, height - padding
    ));
    svg.push_str(&format!(
        "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" class=\"axis\"/>\n",
        padding, height - padding, width - padding, height - padding
    ));

    // Build paths
    let build_path = |vals: &[f64]| -> String {
        stress
            .r
            .iter()
            .enumerate()
            .map(|(i, &r)| {
                let cmd = if i == 0 { "M" } else { "L" };
                format!("{}{:.1},{:.1}", cmd, x_scale(r), y_scale(vals[i]))
            })
            .collect::<Vec<_>>()
            .join(" ")
    };

    let vm_path = build_path(&stress.sigma_vm);
    let hoop_path = build_path(&stress.sigma_h);
    let radial_path = build_path(&stress.sigma_r);

    svg.push_str(&format!(
        "  <path d=\"{}\" class=\"vm\"/>\n  <path d=\"{}\" class=\"hoop\"/>\n  <path d=\"{}\" class=\"radial\"/>\n",
        vm_path, hoop_path, radial_path
    ));

    // Axis labels
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\" text-anchor=\"middle\">0</text>\n",
        padding,
        height - padding + 18
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\" text-anchor=\"middle\">{:.0} mm</text>\n",
        width - padding,
        height - padding + 18,
        max_r
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\" text-anchor=\"end\">{:.0} MPa</text>\n",
        padding - 8,
        padding + 4,
        max_stress
    ));
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\" text-anchor=\"end\">0</text>\n",
        padding - 8,
        height - padding + 4
    ));

    // Axis titles
    svg.push_str(&format!(
        "  <text x=\"{}\" y=\"{}\" class=\"label\" text-anchor=\"middle\">半径 (mm)</text>\n",
        width / 2,
        height - 8
    ));

    // Legend
    let lx = width - 200;
    let ly = padding + 10;
    svg.push_str(&format!(
        "  <rect x=\"{}\" y=\"{}\" width=\"180\" height=\"85\" rx=\"4\" class=\"legend-box\"/>\n",
        lx, ly
    ));

    let legend_items = [
        ("vm", "#f87171", "von Mises 应力"),
        ("hoop", "#60a5fa", "环向应力 σ_h"),
        ("radial", "#34d399", "径向应力 σ_r"),
    ];
    for (i, (_, color, label)) in legend_items.iter().enumerate() {
        let ey = ly + 20 + i as i64 * 22;
        svg.push_str(&format!(
            "  <line x1=\"{}\" y1=\"{}\" x2=\"{}\" y2=\"{}\" stroke=\"{}\" stroke-width=\"2.5\"/>\n",
            lx + 12, ey, lx + 34, ey, color
        ));
        svg.push_str(&format!(
            "  <text x=\"{}\" y=\"{}\" class=\"legend-text\" dominant-baseline=\"middle\">{}</text>\n",
            lx + 40, ey, label
        ));
    }

    svg.push_str("</svg>");
    svg
}

/// Export a self-contained HTML engineering report.
///
/// Generates a complete, standalone HTML file with:
/// - Professional header with title and generation timestamp
/// - Design parameters table
/// - Results summary (mass, inertia, stress, safety, energy)
/// - Inline SVG stress distribution chart
/// - Safety assessment section with warnings
/// - Inline CSS with dark theme (#0a0f14 background, emerald accents)
pub fn export_html_report(sim: &FlywheelSimulation) -> String {
    let params = &sim.params;
    let material = &sim.material;
    let timestamp = current_timestamp_str();

    let flywheel_type_zh = params.flywheel_type.as_str_zh();
    let flywheel_type_en = params.flywheel_type.as_str();

    let safety_status = if sim.safety_passed {
        "通过 ✓"
    } else {
        "未通过 ✗"
    };

    let stress_svg = build_stress_svg_html(sim);

    let warnings_html = if sim.safety_warnings.is_empty() {
        r#"<p style="color: #34d399; font-size: 14px;">所有安全指标均在设计范围内，无警告。</p>"#
            .to_string()
    } else {
        let items: String = sim
            .safety_warnings
            .iter()
            .map(|w| format!("        <li>{}</li>", html_escape(w)))
            .collect::<Vec<_>>()
            .join("\n");
        format!("      <ul class=\"warning-list\">\n{}\n      </ul>", items)
    };

    format!(
        r##"<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FlyForge 飞轮工程报告</title>
  <style>
    /* ── Reset ── */
    *, *::before, *::after {{ margin: 0; padding: 0; box-sizing: border-box; }}

    /* ── Base ── */
    body {{
      background: #0a0f14;
      color: #d1d5db;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
                   'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.7;
      padding: 48px 24px;
      -webkit-font-smoothing: antialiased;
    }}

    /* ── Container ── */
    .container {{ max-width: 960px; margin: 0 auto; }}

    /* ── Header ── */
    .header {{
      text-align: center;
      padding: 32px 0 28px;
      border-bottom: 2px solid #1a2e22;
      margin-bottom: 32px;
    }}
    .header h1 {{
      font-size: 28px;
      font-weight: 700;
      color: #ecfdf5;
      letter-spacing: 0.03em;
      margin-bottom: 8px;
    }}
    .header .subtitle {{
      font-size: 13px;
      color: #6b7280;
    }}
    .header .logo-text {{
      display: inline-block;
      background: linear-gradient(135deg, #10b981, #34d399);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-weight: 800;
      font-size: 32px;
      margin-bottom: 4px;
    }}

    /* ── Section ── */
    .section {{
      background: #0f1923;
      border: 1px solid #1a2e22;
      border-radius: 10px;
      padding: 24px 28px;
      margin-bottom: 24px;
    }}
    .section h2 {{
      font-size: 18px;
      font-weight: 600;
      color: #a7f3d0;
      margin-bottom: 16px;
      padding-bottom: 10px;
      border-bottom: 1px solid #1a2e22;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .section h2 .icon {{
      display: inline-block;
      width: 6px;
      height: 20px;
      background: #10b981;
      border-radius: 3px;
    }}

    /* ── Tables ── */
    table {{
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }}
    table th {{
      text-align: left;
      padding: 10px 14px;
      background: #0a1a14;
      color: #6ee7b7;
      font-weight: 500;
      border-bottom: 1px solid #1a2e22;
      white-space: nowrap;
    }}
    table td {{
      padding: 10px 14px;
      border-bottom: 1px solid #111d18;
      color: #d1d5db;
    }}
    table tr:last-child td {{
      border-bottom: none;
    }}
    table tr:hover td {{
      background: rgba(16, 185, 129, 0.04);
    }}
    table .value {{
      font-family: 'SF Mono', 'Fira Code', 'Cascadia Code', monospace;
      color: #ecfdf5;
      font-weight: 500;
    }}
    table .unit {{
      color: #6b7280;
      font-size: 11px;
      margin-left: 4px;
    }}

    /* ── Safety Badge ── */
    .safety-badge {{
      display: inline-block;
      padding: 6px 20px;
      border-radius: 6px;
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.05em;
    }}
    .safety-badge.pass {{
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid #0d9468;
    }}
    .safety-badge.fail {{
      background: rgba(248, 113, 113, 0.15);
      color: #f87181;
      border: 1px solid #dc2626;
    }}

    /* ── Warning List ── */
    .warning-list {{
      list-style: none;
      padding: 0;
    }}
    .warning-list li {{
      position: relative;
      padding: 8px 12px 8px 24px;
      margin-bottom: 6px;
      background: rgba(251, 191, 36, 0.08);
      border-left: 3px solid #f59e0b;
      border-radius: 0 6px 6px 0;
      font-size: 13px;
      color: #fcd34d;
    }}
    .warning-list li::before {{
      content: "!";
      position: absolute;
      left: 8px;
      top: 8px;
      font-weight: 700;
      color: #f59e0b;
    }}

    /* ── SVG Container ── */
    .chart-container {{
      display: flex;
      justify-content: center;
      padding: 8px 0;
    }}

    /* ── Footer ── */
    .footer {{
      text-align: center;
      padding: 24px 0 0;
      border-top: 1px solid #1a2e22;
      margin-top: 16px;
      font-size: 12px;
      color: #4b5563;
    }}

    /* ── Print ── */
    @media print {{
      body {{ background: #fff; color: #111; padding: 20px; }}
      .section {{ border-color: #ccc; background: #fafafa; }}
      .header {{ border-color: #ccc; }}
      .header h1, .header .logo-text {{ color: #111; -webkit-text-fill-color: #111; }}
      table th {{ background: #eee; color: #333; }}
      table td {{ color: #111; border-color: #ddd; }}
      .footer {{ border-color: #ccc; }}
    }}
  </style>
</head>
<body>
  <div class="container">

    <!-- ════════════ Header ════════════ -->
    <div class="header">
      <div class="logo-text">FlyForge</div>
      <h1>飞轮工程报告</h1>
      <p class="subtitle">生成时间: {timestamp}</p>
    </div>

    <!-- ════════════ Design Parameters ════════════ -->
    <div class="section">
      <h2><span class="icon"></span>设计参数</h2>
      <table>
        <tr><th>参数</th><th>值</th><th>说明</th></tr>
        <tr>
          <td>飞轮类型</td>
          <td class="value">{flywheel_type_zh}</td>
          <td>{flywheel_type_en}</td>
        </tr>
        <tr>
          <td>材料</td>
          <td class="value">{material_name_zh}</td>
          <td>{material_name}</td>
        </tr>
        <tr>
          <td>外径</td>
          <td class="value">{r_o}<span class="unit">mm</span></td>
          <td>外半径</td>
        </tr>
        <tr>
          <td>内径</td>
          <td class="value">{r_i}<span class="unit">mm</span></td>
          <td>内半径（轮毂孔）</td>
        </tr>
        <tr>
          <td>厚度</td>
          <td class="value">{thickness}<span class="unit">mm</span></td>
          <td>轮缘厚度</td>
        </tr>
        <tr>
          <td>额定转速</td>
          <td class="value">{rpm_rated}<span class="unit">rpm</span></td>
          <td>正常工作转速</td>
        </tr>
        <tr>
          <td>最大转速</td>
          <td class="value">{rpm_max}<span class="unit">rpm</span></td>
          <td>极限运行转速</td>
        </tr>
        <tr>
          <td>最小转速</td>
          <td class="value">{rpm_min}<span class="unit">rpm</span></td>
          <td>放电截止转速</td>
        </tr>
        <tr>
          <td>工作温度</td>
          <td class="value">{op_temp}<span class="unit">°C</span></td>
          <td>运行环境温度</td>
        </tr>
        <tr>
          <td>密度</td>
          <td class="value">{density}<span class="unit">kg/m³</span></td>
          <td>材料密度</td>
        </tr>
        <tr>
          <td>屈服强度</td>
          <td class="value">{yield_strength}<span class="unit">MPa</span></td>
          <td>材料屈服强度</td>
        </tr>
        <tr>
          <td>安全系数（屈服）</td>
          <td class="value">{sf_yield}</td>
          <td>设计安全系数</td>
        </tr>
      </table>
    </div>

    <!-- ════════════ Results Summary ════════════ -->
    <div class="section">
      <h2><span class="icon"></span>仿真结果</h2>
      <table>
        <tr><th>指标</th><th>数值</th><th>单位</th></tr>
        <tr>
          <td>质量</td>
          <td class="value">{mass:.4}</td>
          <td>kg</td>
        </tr>
        <tr>
          <td>转动惯量</td>
          <td class="value">{inertia:.6}</td>
          <td>kg·m²</td>
        </tr>
        <tr>
          <td>最大 von Mises 应力（额定转速）</td>
          <td class="value">{max_stress:.2}</td>
          <td>MPa</td>
        </tr>
        <tr>
          <td>最大应力位置</td>
          <td class="value">{max_stress_loc:.1}</td>
          <td>mm（半径）</td>
        </tr>
        <tr>
          <td>屈服安全裕度</td>
          <td class="value">{safety_yield:.2}</td>
          <td>—</td>
        </tr>
        <tr>
          <td>疲劳安全裕度</td>
          <td class="value">{safety_fatigue:.2}</td>
          <td>—</td>
        </tr>
        <tr>
          <td>额定储能</td>
          <td class="value">{energy_rated:.2}</td>
          <td>kJ</td>
        </tr>
        <tr>
          <td>最大储能</td>
          <td class="value">{energy_max:.2}</td>
          <td>kJ</td>
        </tr>
        <tr>
          <td>可用能量</td>
          <td class="value">{energy_usable:.2}</td>
          <td>kJ</td>
        </tr>
        <tr>
          <td>比能量</td>
          <td class="value">{specific_energy:.2}</td>
          <td>Wh/kg</td>
        </tr>
        <tr>
          <td>比功率</td>
          <td class="value">{specific_power:.2}</td>
          <td>W/kg</td>
        </tr>
        <tr>
          <td>安全爆破转速</td>
          <td class="value">{rpm_burst_safe:.0}</td>
          <td>rpm</td>
        </tr>
      </table>
    </div>

    <!-- ════════════ Stress Distribution Chart ════════════ -->
    <div class="section">
      <h2><span class="icon"></span>应力分布图</h2>
      <div class="chart-container">
        {stress_svg}
      </div>
    </div>

    <!-- ════════════ Safety Assessment ════════════ -->
    <div class="section">
      <h2><span class="icon"></span>安全评估</h2>
      <div style="margin-bottom: 16px;">
        <span style="font-size: 14px; color: #9ca3af; margin-right: 12px;">总体评估:</span>
        <span class="safety-badge {safety_badge_class}">{safety_status}</span>
      </div>
      <div style="margin-bottom: 8px; font-size: 14px; color: #9ca3af;">警告与说明:</div>
      {warnings_html}
    </div>

    <!-- ════════════ Footer ════════════ -->
    <div class="footer">
      <p>FlyForge v0.4.0 — 飞轮储能仿真与优化工具</p>
      <p>本报告由 FlyForge 自动生成，仅供参考。最终设计需经专业工程师审核。</p>
    </div>

  </div>
</body>
</html>"##,
        timestamp = timestamp,
        flywheel_type_zh = flywheel_type_zh,
        flywheel_type_en = flywheel_type_en,
        material_name_zh = html_escape(&material.name_zh),
        material_name = html_escape(&material.name),
        r_o = params.r_o,
        r_i = params.r_i,
        thickness = params.thickness,
        rpm_rated = params.rpm_rated,
        rpm_max = params.rpm_max,
        rpm_min = params.rpm_min,
        op_temp = params.operating_temperature,
        density = material.density,
        yield_strength = material.yield_strength,
        sf_yield = params.safety_factor_yield,
        mass = sim.mass,
        inertia = sim.moment_of_inertia,
        max_stress = sim.max_stress_rated,
        max_stress_loc = sim.max_stress_location,
        safety_yield = sim.actual_safety_yield,
        safety_fatigue = sim.actual_safety_fatigue,
        energy_rated = sim.energy_rated,
        energy_max = sim.energy_max,
        energy_usable = sim.energy_usable,
        specific_energy = sim.specific_energy,
        specific_power = sim.specific_power,
        rpm_burst_safe = sim.rpm_burst_safe,
        stress_svg = stress_svg,
        safety_badge_class = if sim.safety_passed { "pass" } else { "fail" },
        safety_status = safety_status,
        warnings_html = warnings_html,
    )
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

    #[test]
    fn test_export_html_report() {
        let sim = create_test_simulation();
        let html = export_html_report(&sim);

        // Basic structure checks
        assert!(html.contains("<!DOCTYPE html>"));
        assert!(html.contains("</html>"));
        assert!(html.contains("FlyForge 飞轮工程报告"));
        assert!(html.contains("飞轮工程报告"));
        assert!(html.contains("生成时间:"));
        assert!(html.contains("设计参数"));
        assert!(html.contains("仿真结果"));
        assert!(html.contains("应力分布图"));
        assert!(html.contains("安全评估"));

        // Dark theme color checks
        assert!(html.contains("#0a0f14"));
        assert!(html.contains("#1a2e22"));
        assert!(html.contains("#10b981"));

        // SVG chart is embedded
        assert!(html.contains("<svg"));
        assert!(html.contains("von Mises"));
        assert!(html.contains("环向应力"));

        // Material and parameter data
        assert!(html.contains("AISI 4340"));
        assert!(html.contains("环形轮"));

        // Self-contained (no external links)
        assert!(!html.contains("href=\"http"));
        assert!(!html.contains("src=\"http"));

        // Safety assessment
        assert!(html.contains("safety-badge"));
    }

    #[test]
    fn test_html_escape() {
        assert_eq!(html_escape("a<b>c"), "a&lt;b&gt;c");
        assert_eq!(html_escape("a&b"), "a&amp;b");
        assert_eq!(html_escape("\"quoted\""), "&quot;quoted&quot;");
    }

    #[test]
    fn test_timestamp_format() {
        let ts = current_timestamp_str();
        // Should match "YYYY-MM-DD HH:MM:SS UTC"
        assert!(ts.ends_with(" UTC"));
        let parts: Vec<&str> = ts.split(' ').collect();
        assert_eq!(parts.len(), 3); // date, time, UTC
        assert!(parts[0].contains('-')); // YYYY-MM-DD
        assert!(parts[1].contains(':')); // HH:MM:SS
    }
}

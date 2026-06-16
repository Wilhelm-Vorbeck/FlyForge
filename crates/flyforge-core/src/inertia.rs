//! Moment of Inertia Computation
//!
//! Analytical formulas for simple geometries.
//! Numerical integration (Simpson's 1/3 rule) for variable-thickness sections.
//!
//! All internal computations use SI units (meters, kg).
//!
//! Reference: 机械知识库/公式计算/01-几何体计算.md - 转动惯量计算
//! Reference: 机械知识库/设计基础/11-截面性质与质量性质-诺顿补充.md - 空心圆柱

use crate::types::{FlywheelParams, FlywheelSection, InertiaResult, Material};
use std::f64::consts::PI;

/// Compute mass and inertia for a solid disk (analytical).
///
/// Reference: 机械知识库/公式计算/01-几何体计算.md
///   圆盘（中心）: J = mR^2/2
///   m = rho * pi * R^2 * t
///
/// Input: params in mm, material in SI. Output: mass (kg), inertia (kg·m^2).
pub fn mass_inertia_solid(params: &FlywheelParams, material: &Material) -> InertiaResult {
    let r_o = params.r_o / 1000.0; // mm -> m
    let t = params.thickness / 1000.0;

    let volume = PI * r_o * r_o * t; // m^3
    let mass = material.density * volume; // kg
    let inertia = 0.5 * mass * r_o * r_o; // kg·m^2

    InertiaResult { mass, moment_of_inertia: inertia }
}

/// Compute mass and inertia for an annular ring (analytical).
///
/// Reference: 机械知识库/公式计算/01-几何体计算.md
///   圆环（中心）: J = m(R1^2 + R2^2)/2
///   m = rho * pi * (R^2 - r^2) * t
///
/// Reference: 机械知识库/设计基础/11-截面性质与质量性质-诺顿补充.md
///   空心圆柱: I_z = m(a^2 + b^2)/2
pub fn mass_inertia_annular(params: &FlywheelParams, material: &Material) -> InertiaResult {
    let r_o = params.r_o / 1000.0;
    let r_i = params.r_i / 1000.0;
    let t = params.thickness / 1000.0;

    let volume = PI * (r_o * r_o - r_i * r_i) * t;
    let mass = material.density * volume;
    let inertia = 0.5 * mass * (r_o * r_o + r_i * r_i);

    InertiaResult { mass, moment_of_inertia: inertia }
}

/// Compute mass and inertia for a multi-layer composite flywheel (analytical).
///
/// J_total = J_rim + J_web + J_hub (three regions superimposed)
///
/// Reference: 项目记忆文件 - 七、核心公式全集
pub fn mass_inertia_multi_layer(params: &FlywheelParams, material: &Material) -> InertiaResult {
    let r_o = params.r_o / 1000.0;
    let r_i = params.r_i / 1000.0;
    let r_hub = params.r_hub / 1000.0;
    let t_rim = params.thickness / 1000.0;
    let t_hub = params.hub_thickness / 1000.0;
    let t_web = t_rim * 0.4;

    // Hub region: r_i to r_hub, thickness = t_hub
    let vol_hub = PI * (r_hub * r_hub - r_i * r_i) * t_hub;
    let mass_hub = material.density * vol_hub;
    let j_hub = 0.5 * mass_hub * (r_hub * r_hub + r_i * r_i);

    // Web region: r_hub to r_rim_inner (approx 0.85*r_o), thickness = t_web
    let r_rim_inner = r_o * 0.85;
    let vol_web = PI * (r_rim_inner * r_rim_inner - r_hub * r_hub) * t_web;
    let mass_web = material.density * vol_web;
    let j_web = 0.5 * mass_web * (r_rim_inner * r_rim_inner + r_hub * r_hub);

    // Rim region: r_rim_inner to r_o, thickness = t_rim
    let vol_rim = PI * (r_o * r_o - r_rim_inner * r_rim_inner) * t_rim;
    let mass_rim = material.density * vol_rim;
    let j_rim = 0.5 * mass_rim * (r_o * r_o + r_rim_inner * r_rim_inner);

    let total_mass = mass_hub + mass_web + mass_rim;
    let total_inertia = j_hub + j_web + j_rim;

    InertiaResult {
        mass: total_mass,
        moment_of_inertia: total_inertia,
    }
}

/// Compute mass and inertia using numerical integration (Simpson's 1/3 rule).
///
/// For variable-thickness sections: J = 2*pi*rho * integral(r^3 * t(r), dr)
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   变厚度: J = 2*pi*rho * integral(0, R, r^3 * t(r)) dr (Simpson 1/3)
///
/// Input: section with r_points (mm) and t_points (mm), material density (kg/m^3).
/// Output: mass (kg), inertia (kg·m^2).
pub fn mass_inertia_numerical(
    section: &FlywheelSection,
    material: &Material,
) -> InertiaResult {
    let r_points = &section.r_points;
    let t_points = &section.t_points;
    let n = r_points.len();

    if n < 3 {
        // Fallback to trapezoidal for too few points
        return mass_inertia_trapezoidal(section, material);
    }

    let rho = material.density;
    let mut mass_integrand = 0.0; // integral of 2*pi*rho * r * t(r) dr
    let mut inertia_integrand = 0.0; // integral of 2*pi*rho * r^3 * t(r) dr

    // Simpson's 1/3 rule requires odd number of points
    // Use composite Simpson for even intervals
    let n_simpson = if n % 2 == 0 { n - 1 } else { n };
    let h = (r_points[n_simpson - 1] - r_points[0]) / (n_simpson as f64 - 1.0);

    for i in (0..n_simpson).step_by(2) {
        let r_m = r_points[i] / 1000.0; // mm -> m
        let r_m1 = r_points[i + 1] / 1000.0;
        let t_m = t_points[i] / 1000.0; // mm -> m
        let t_m1 = t_points[i + 1] / 1000.0;

        let f_left = r_m * t_m;
        let f_mid = r_m1 * t_m1;
        let g_left = r_m.powi(3) * t_m;
        let g_mid = r_m1.powi(3) * t_m1;

        if i + 2 < n_simpson {
            let r_m2 = r_points[i + 2] / 1000.0;
            let t_m2 = t_points[i + 2] / 1000.0;
            let f_right = r_m2 * t_m2;
            let g_right = r_m2.powi(3) * t_m2;

            mass_integrand += h / 1000.0 * (f_left + 4.0 * f_mid + f_right) / 3.0;
            inertia_integrand += h / 1000.0 * (g_left + 4.0 * g_mid + g_right) / 3.0;
        }
    }

    let mass = 2.0 * PI * rho * mass_integrand;
    let inertia = 2.0 * PI * rho * inertia_integrand;

    InertiaResult {
        mass,
        moment_of_inertia: inertia,
    }
}

/// Fallback: trapezoidal integration for mass and inertia.
fn mass_inertia_trapezoidal(
    section: &FlywheelSection,
    material: &Material,
) -> InertiaResult {
    let r_points = &section.r_points;
    let t_points = &section.t_points;
    let rho = material.density;
    let mut mass_int = 0.0;
    let mut inertia_int = 0.0;

    for i in 0..r_points.len() - 1 {
        let r0 = r_points[i] / 1000.0;
        let r1 = r_points[i + 1] / 1000.0;
        let t0 = t_points[i] / 1000.0;
        let t1 = t_points[i + 1] / 1000.0;
        let dr = r1 - r0;

        // Mass integrand: 2*pi*rho * r * t(r)
        mass_int += dr * 0.5 * (r0 * t0 + r1 * t1);
        // Inertia integrand: 2*pi*rho * r^3 * t(r)
        inertia_int += dr * 0.5 * (r0.powi(3) * t0 + r1.powi(3) * t1);
    }

    let mass = 2.0 * PI * rho * mass_int;
    let inertia = 2.0 * PI * rho * inertia_int;

    InertiaResult {
        mass,
        moment_of_inertia: inertia,
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::{FlywheelType, materials};

    fn default_params() -> FlywheelParams {
        FlywheelParams::default()
    }

    #[test]
    fn test_mass_inertia_solid() {
        // Reference: 机械知识库/公式计算/01-几何体计算.md
        // J = mR^2/2, m = rho*pi*R^2*t
        let params = FlywheelParams {
            r_o: 200.0,
            r_i: 0.0,
            thickness: 50.0,
            flywheel_type: FlywheelType::SolidDisk,
            ..default_params()
        };
        let mat = materials::aisi_4340_steel();
        let result = mass_inertia_solid(&params, &mat);

        let r_m = 0.2; // 200mm in meters
        let t_m = 0.05;
        let expected_mass = 7850.0 * PI * r_m * r_m * t_m;
        let expected_inertia = 0.5 * expected_mass * r_m * r_m;

        assert!(
            (result.mass - expected_mass).abs() < 0.001,
            "Mass: got {}, expected {}",
            result.mass,
            expected_mass
        );
        assert!(
            (result.moment_of_inertia - expected_inertia).abs() < 1e-6,
            "Inertia: got {}, expected {}",
            result.moment_of_inertia,
            expected_inertia
        );
    }

    #[test]
    fn test_mass_inertia_annular() {
        // Reference: 机械知识库/公式计算/01-几何体计算.md
        // 圆环: J = m(R1^2+R2^2)/2
        let params = FlywheelParams {
            r_o: 200.0,
            r_i: 40.0,
            thickness: 50.0,
            ..default_params()
        };
        let mat = materials::aisi_4340_steel();
        let result = mass_inertia_annular(&params, &mat);

        let r_o_m: f64 = 0.2; // 200mm in meters
        let r_i_m: f64 = 0.04;
        let t_m: f64 = 0.05;
        let expected_mass = 7850.0 * PI * (r_o_m.powi(2) - r_i_m.powi(2)) * t_m;
        let expected_inertia = 0.5 * expected_mass * (r_o_m.powi(2) + r_i_m.powi(2));

        assert!(
            (result.mass - expected_mass).abs() < 0.001,
            "Mass: got {}, expected {}",
            result.mass,
            expected_mass
        );
        assert!(
            (result.moment_of_inertia - expected_inertia).abs() < 1e-6,
            "Inertia: got {}, expected {}",
            result.moment_of_inertia,
            expected_inertia
        );
    }

    #[test]
    fn test_mass_inertia_annular_reasonable_values() {
        let params = default_params();
        let mat = materials::aisi_4340_steel();
        let result = mass_inertia_annular(&params, &mat);

        // For default params (r_o=200mm, r_i=40mm, t=50mm, steel):
        // Mass should be ~40-55 kg
        assert!(result.mass > 40.0 && result.mass < 55.0, "mass {}", result.mass);
        // Inertia should be ~0.5-1.5 kg·m^2
        assert!(result.moment_of_inertia > 0.5 && result.moment_of_inertia < 1.5, "inertia {}", result.moment_of_inertia);
    }

    #[test]
    fn test_multi_layer_inertia_positive() {
        let params = default_params();
        let mat = materials::aisi_4340_steel();
        let multi = mass_inertia_multi_layer(&params, &mat);

        // Multi-layer should have positive mass and inertia
        assert!(multi.mass > 0.0, "Multi-layer mass should be positive");
        assert!(multi.moment_of_inertia > 0.0, "Multi-layer inertia should be positive");
        // Multi-layer inertia should be in reasonable range
        assert!(multi.moment_of_inertia > 0.1, "Multi-layer inertia {} too small", multi.moment_of_inertia);
    }
}
//! Stress Analysis
//!
//! Lame solution for rotating disk + von Mises equivalent stress.
//! All internal computations use SI units (meters, Pa).
//!
//! Reference: 机械知识库/设计基础/03-常力学公式.md - 动荷应力
//! Reference: 项目记忆文件 - 七、核心公式全集

use crate::types::{FlywheelParams, Material, StressDistribution};

/// Compute Lame stress for an annular (hollow) rotating disk.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   空心圆盘（自由边界）:
///     sigma_r(r) = (3+nu)/8 * rho*omega^2 * [R^2 + r_i^2 - R^2*r_i^2/r^2 - r^2]
///     sigma_h(r) = (3+nu)/8 * rho*omega^2 * [R^2 + r_i^2 + R^2*r_i^2/r^2 - (1+3nu)/(3+nu) * r^2]
///
/// Input: r array in meters, params in mm, material in SI, omega in rad/s.
/// Output: sigma_r and sigma_h in Pa.
pub fn lame_stress_annular(
    r: &[f64],
    params: &FlywheelParams,
    material: &Material,
    omega: f64,
) -> (Vec<f64>, Vec<f64>) {
    let nu = material.poisson_ratio;
    let rho = material.density;
    let r_o = params.r_o / 1000.0;
    let r_i = params.r_i / 1000.0;

    let coeff = (3.0 + nu) / 8.0 * rho * omega * omega;
    let r_o2 = r_o * r_o;
    let r_i2 = r_i * r_i;
    let o_i_product = r_o2 * r_i2;
    let hoop_r2_coeff = (1.0 + 3.0 * nu) / (3.0 + nu);

    let n = r.len();
    let mut sigma_r = Vec::with_capacity(n);
    let mut sigma_h = Vec::with_capacity(n);

    for &radius in r {
        let r2 = radius * radius;
        // When r_i=0 and r=0 (first radial point), the term o_i_product/r2 = 0/0 = NaN.
        // At r=0 the hoop stress is well-defined (equals center stress of solid disk).
        // Use the solid disk formula at this singular point.
        if r2 < 1e-24 {
            let sr = coeff * (r_o2 - r2);
            let sh = coeff * (r_o2 - hoop_r2_coeff * r2);
            sigma_r.push(sr);
            sigma_h.push(sh);
        } else {
            let sr = coeff * (r_o2 + r_i2 - o_i_product / r2 - r2);
            let sh = coeff * (r_o2 + r_i2 + o_i_product / r2 - hoop_r2_coeff * r2);
            sigma_r.push(sr);
            sigma_h.push(sh);
        }
    }

    (sigma_r, sigma_h)
}

/// Compute Lame stress for a solid rotating disk.
///
/// Solid disk is a special case of annular ring (r_i = 0):
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   实心圆盘:
///     sigma_r(r) = (3+nu)/8 * rho*omega^2 * (R^2 - r^2)
///     sigma_h(r) = (3+nu)/8 * rho*omega^2 * [R^2 - (1+3nu)/(3+nu) * r^2]
pub fn lame_stress_solid(
    r: &[f64],
    r_o_m: f64,
    nu: f64,
    density: f64,
    omega: f64,
) -> (Vec<f64>, Vec<f64>) {
    let coeff = (3.0 + nu) / 8.0 * density * omega * omega;
    let r_o2 = r_o_m * r_o_m;
    let hoop_r2_coeff = (1.0 + 3.0 * nu) / (3.0 + nu);

    let n = r.len();
    let mut sigma_r = Vec::with_capacity(n);
    let mut sigma_h = Vec::with_capacity(n);

    for &radius in r {
        let r2 = radius * radius;
        sigma_r.push(coeff * (r_o2 - r2));
        sigma_h.push(coeff * (r_o2 - hoop_r2_coeff * r2));
    }

    (sigma_r, sigma_h)
}

/// Compute von Mises equivalent stress for plane stress (sigma_z = 0).
///
/// Reference: 机械知识库/设计基础/03-常力学公式.md
///   第四强度理论: sqrt(sigma^2 + 3*tau^2)
///
/// For pure plane stress (tau=0, sigma_z=0):
///   sigma_vm = sqrt(sigma_r^2 - sigma_r*sigma_h + sigma_h^2)
pub fn von_mises_plane_stress(sigma_r: &[f64], sigma_h: &[f64]) -> Vec<f64> {
    sigma_r
        .iter()
        .zip(sigma_h.iter())
        .map(|(&sr, &sh)| (sr * sr - sr * sh + sh * sh).sqrt())
        .collect()
}

/// Compute radial displacement at each point.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   u(r) = r/E * (sigma_h - nu * sigma_r)
///
/// Input: r in meters, stresses in Pa, E in GPa. Output: displacement in meters.
pub fn radial_displacement(
    r: &[f64],
    sigma_r: &[f64],
    sigma_h: &[f64],
    young_modulus_gpa: f64,
    poisson_ratio: f64,
) -> Vec<f64> {
    let e_pa = young_modulus_gpa * 1e9; // GPa -> Pa
    r.iter()
        .zip(sigma_r.iter())
        .zip(sigma_h.iter())
        .map(|((&ri, &sr), &sh)| ri / e_pa * (sh - poisson_ratio * sr))
        .collect()
}

/// Convert stresses from Pa to MPa.
pub fn pa_to_mpa(stress_pa: &[f64]) -> Vec<f64> {
    stress_pa.iter().map(|&s| s * 1e-6).collect()
}

/// Generate radial points in meters for stress computation.
///
/// Input: params in mm.
pub fn generate_r_points_m(params: &FlywheelParams) -> Vec<f64> {
    let r_o = params.r_o / 1000.0;
    let r_i = params.r_i / 1000.0;
    let n = params.n_points.max(2);

    if params.flywheel_type.has_bore() {
        (0..n)
            .map(|i| r_i + (r_o - r_i) * i as f64 / (n as f64 - 1.0))
            .collect()
    } else {
        // Solid disk: avoid r=0 to prevent division issues
        let dr = r_o / (n as f64);
        (0..n).map(|i| dr * (i as f64 + 0.5)).collect()
    }
}

/// Compute complete stress distribution for a flywheel at given angular velocity.
///
/// Dispatches between solid and annular solutions based on flywheel type.
/// Returns stress in MPa (for display).
pub fn compute_stress_distribution(
    params: &FlywheelParams,
    material: &Material,
    omega: f64,
) -> StressDistribution {
    let r = generate_r_points_m(params);

    let (sigma_r, sigma_h) = if params.flywheel_type.has_bore() {
        lame_stress_annular(&r, params, material, omega)
    } else {
        lame_stress_solid(
            &r,
            params.r_o / 1000.0,
            material.poisson_ratio,
            material.density,
            omega,
        )
    };

    let sigma_vm = von_mises_plane_stress(&sigma_r, &sigma_h);

    // Convert Pa -> MPa and m -> mm for output
    StressDistribution {
        r: r.iter().map(|&x| x * 1000.0).collect(),
        sigma_r: pa_to_mpa(&sigma_r),
        sigma_h: pa_to_mpa(&sigma_h),
        sigma_vm: pa_to_mpa(&sigma_vm),
    }
}

/// Estimate yield limit rpm.
///
/// For a constant-thickness disk, max von Mises stress occurs at bore,
/// proportional to omega^2.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
pub fn estimate_yield_rpm(
    rpm_rated: f64,
    max_stress_rated: f64,
    yield_strength: f64,
    safety_factor: f64,
) -> f64 {
    if max_stress_rated <= 0.0 {
        return f64::INFINITY;
    }
    rpm_rated * (yield_strength / (max_stress_rated * safety_factor)).sqrt()
}

/// Estimate theoretical burst rpm.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   rpm_burst = rpm_rated * sqrt(sigma_ult / avg_hoop_stress)
pub fn estimate_burst_rpm(
    rpm_rated: f64,
    avg_hoop_stress_rated: f64,
    tensile_strength: f64,
    safety_factor: f64,
) -> f64 {
    if avg_hoop_stress_rated <= 0.0 {
        return f64::INFINITY;
    }
    rpm_rated * (tensile_strength / (avg_hoop_stress_rated * safety_factor)).sqrt()
}

/// Compute energy stored in flywheel.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   E = 0.5 * J * omega^2 (J)
pub fn kinetic_energy(inertia: f64, omega: f64) -> f64 {
    0.5 * inertia * omega * omega
}

/// Compute specific energy (Wh/kg).
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   u_m = E / m (Wh/kg = J / 3600 / m)
pub fn specific_energy(energy_j: f64, mass_kg: f64) -> f64 {
    if mass_kg <= 0.0 {
        return 0.0;
    }
    energy_j / 3600.0 / mass_kg
}

/// Speed fluctuation coefficient.
///
/// Reference: 项目记忆文件 - 七、核心公式全集
///   Cs = (omega_max - omega_min) / omega_avg
pub fn speed_fluctuation_coeff(rpm_max: f64, rpm_min: f64) -> f64 {
    let avg = (rpm_max + rpm_min) / 2.0;
    if avg <= 0.0 {
        return 0.0;
    }
    (rpm_max - rpm_min) / avg
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    fn default_params() -> FlywheelParams {
        FlywheelParams::default()
    }

    #[test]
    fn test_stress_at_bore_higher_than_rim() {
        // For annular disk, stress at inner radius should be higher than at outer
        let params = FlywheelParams {
            r_o: 200.0,
            r_i: 40.0,
            ..default_params()
        };
        let mat = materials::aisi_4340_steel();
        let omega = params.omega(3000.0);
        let r = generate_r_points_m(&params);
        let (sr, sh) = lame_stress_annular(&r, &params, &mat, omega);
        let svm = von_mises_plane_stress(&sr, &sh);
        // Inner stress should be higher than outer
        assert!(
            svm[0] > svm[svm.len() - 1],
            "inner vm={}, outer vm={}",
            svm[0],
            svm[svm.len() - 1]
        );
    }

    #[test]
    fn test_stress_increases_with_speed() {
        // Stress should increase with omega^2
        let params = default_params();
        let mat = materials::aisi_4340_steel();

        let dist_low = compute_stress_distribution(&params, &mat, params.omega(1000.0));
        let dist_high = compute_stress_distribution(&params, &mat, params.omega(3000.0));

        let max_low = dist_low
            .sigma_vm
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        let max_high = dist_high
            .sigma_vm
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);

        assert!(max_high > max_low, "Higher speed should produce higher stress");
    }

    #[test]
    fn test_stress_solid_disk_max_at_center() {
        // For solid disk, max stress should be at center
        let params = FlywheelParams {
            r_o: 200.0,
            r_i: 0.0,
            flywheel_type: crate::types::FlywheelType::SolidDisk,
            ..default_params()
        };
        let mat = materials::aisi_4340_steel();
        let omega = params.omega(3000.0);
        let r = generate_r_points_m(&params);
        let (sr, sh) = lame_stress_solid(
            &r,
            params.r_o / 1000.0,
            mat.poisson_ratio,
            mat.density,
            omega,
        );
        let svm = von_mises_plane_stress(&sr, &sh);
        // Max should be at first point (closest to center)
        let max_idx = svm
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .unwrap()
            .0;
        assert_eq!(max_idx, 0, "Max stress should be at center for solid disk");
    }

    #[test]
    fn test_kinetic_energy() {
        // Reference: 机械知识库/公式计算/01-几何体计算.md
        // E = 0.5 * J * omega^2
        let j = 1.0; // kg·m^2
        let omega = 100.0; // rad/s
        let energy = kinetic_energy(j, omega);
        assert!(
            (energy - 5000.0).abs() < 0.01,
            "Energy: got {}, expected 5000.0",
            energy
        );
    }

    #[test]
    fn test_speed_fluctuation() {
        // Reference: 项目记忆文件 - 七、核心公式全集
        // Cs = (omega_max - omega_min) / omega_avg
        let cs = speed_fluctuation_coeff(4500.0, 1500.0);
        let expected = (4500.0 - 1500.0) / ((4500.0 + 1500.0) / 2.0);
        assert!(
            (cs - expected).abs() < 1e-10,
            "Cs: got {}, expected {}",
            cs,
            expected
        );
    }

    #[test]
    fn test_stress_output_in_mpa() {
        // Verify that output stresses are in reasonable MPa range
        let params = default_params();
        let mat = materials::aisi_4340_steel();
        let dist = compute_stress_distribution(&params, &mat, params.omega(3000.0));

        // For default params at 3000rpm, stresses should be < 500 MPa
        let max_vm = dist
            .sigma_vm
            .iter()
            .cloned()
            .fold(f64::NEG_INFINITY, f64::max);
        assert!(max_vm > 0.0 && max_vm < 500.0, "Max von Mises: {} MPa", max_vm);
    }

    #[test]
    fn test_lame_annular_boundary_conditions() {
        // For free-boundary annular disk:
        // sigma_r should be zero at r=r_i and r=r_o (free surfaces)
        // Reference: 项目记忆文件 - 七、核心公式全集
        let params = default_params(); // r_o=200, r_i=40
        let mat = materials::aisi_4340_steel();
        let omega = params.omega(3000.0);

        let r = generate_r_points_m(&params);
        let (sigma_r, _) = lame_stress_annular(&r, &params, &mat, omega);

        // At inner boundary (first point), sigma_r should be ~0
        let sr_inner = sigma_r[0];
        // At outer boundary (last point), sigma_r should be ~0
        let sr_outer = sigma_r[sigma_r.len() - 1];

        assert!(sr_inner.abs() < 1e6,
            "Radial stress at inner boundary should be ~0, got {} Pa", sr_inner);
        assert!(sr_outer.abs() < 1e6,
            "Radial stress at outer boundary should be ~0, got {} Pa", sr_outer);
    }

    #[test]
    fn test_lame_annular_hoop_always_positive() {
        // Hoop stress should always be positive (tensile) for rotating disk
        let params = default_params();
        let mat = materials::aisi_4340_steel();
        let omega = params.omega(3000.0);

        let r = generate_r_points_m(&params);
        let (_, sigma_h) = lame_stress_annular(&r, &params, &mat, omega);

        for (i, &sh) in sigma_h.iter().enumerate() {
            assert!(sh > 0.0,
                "Hoop stress should be positive at point {}, got {} Pa", i, sh);
        }
    }

    #[test]
    fn test_lame_solid_max_stress_at_center() {
        // For solid disk, both sigma_r and sigma_h are maximum at r=0
        // sigma_r(0) = sigma_h(0) = (3+nu)/8 * rho * omega^2 * R^2
        // Reference: 项目记忆文件 - 七、核心公式全集
        let params = FlywheelParams {
            r_o: 200.0,
            r_i: 0.0,
            flywheel_type: crate::types::FlywheelType::SolidDisk,
            ..default_params()
        };
        let mat = materials::aisi_4340_steel();
        let omega = params.omega(3000.0);

        let r = generate_r_points_m(&params);
        let (sigma_r, sigma_h) = lame_stress_solid(
            &r,
            params.r_o / 1000.0,
            mat.poisson_ratio,
            mat.density,
            omega,
        );

        // Max radial stress should be at first point (closest to center)
        let max_r_idx = sigma_r.iter().enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap()).unwrap().0;
        assert_eq!(max_r_idx, 0, "Max radial stress should be at center");

        // Max hoop stress should be at first point
        let max_h_idx = sigma_h.iter().enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap()).unwrap().0;
        assert_eq!(max_h_idx, 0, "Max hoop stress should be at center");
    }

    #[test]
    fn test_stress_analytical_check_solid_center() {
        // Verify against analytical formula at center of solid disk:
        // sigma_r = sigma_h = (3+nu)/8 * rho * omega^2 * R^2
        // Reference: 项目记忆文件 - 七、核心公式全集
        let r_o_m: f64 = 0.2; // 200mm
        let nu: f64 = 0.29;   // AISI 4340
        let rho: f64 = 7850.0; // kg/m^3
        let rpm: f64 = 3000.0;
        let omega: f64 = rpm * std::f64::consts::PI / 30.0;

        let expected = (3.0 + nu) / 8.0 * rho * omega * omega * r_o_m * r_o_m;

        let r = vec![0.001]; // Near center
        let (sigma_r, sigma_h) = lame_stress_solid(&r, r_o_m, nu, rho, omega);

        // At r~0, sigma_r ≈ sigma_h ≈ expected
        let error_r = ((sigma_r[0] - expected) / expected).abs();
        let error_h = ((sigma_h[0] - expected) / expected).abs();

        assert!(error_r < 0.01,
            "Radial stress at center: expected {:.0} Pa, got {:.0} Pa, error {:.2}%",
            expected, sigma_r[0], error_r * 100.0);
        assert!(error_h < 0.01,
            "Hoop stress at center: expected {:.0} Pa, got {:.0} Pa, error {:.2}%",
            expected, sigma_h[0], error_h * 100.0);
    }

    #[test]
    fn test_energy_formula_verification() {
        // E = 0.5 * J * omega^2
        // At 3000rpm: omega = 314.16 rad/s
        // For J=1.0 kg·m^2: E = 0.5 * 1.0 * 314.16^2 = 49348.0 J ≈ 49.3 kJ
        let j: f64 = 1.0;
        let omega: f64 = 3000.0 * std::f64::consts::PI / 30.0;
        let energy = kinetic_energy(j, omega);
        let expected = 0.5 * j * omega * omega;

        assert!((energy - expected).abs() < 0.01,
            "Energy: got {}, expected {}", energy, expected);

        // Verify specific energy
        let mass: f64 = 50.0; // kg
        let se = specific_energy(energy, mass);
        let expected_se = energy / 3600.0 / mass;
        assert!((se - expected_se).abs() < 1e-10,
            "Specific energy: got {}, expected {}", se, expected_se);
    }
}
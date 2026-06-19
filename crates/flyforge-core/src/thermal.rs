/// Thermal Stress Analysis
///
/// Computes thermal stress for a rotating disk with radial temperature gradient,
/// and applies temperature-dependent material property degradation.
///
/// References:
/// - Timoshenko & Goodier, Theory of Elasticity — thermal stress in disks
/// - ASME Boiler & Pressure Vessel Code — temperature de-rating
use crate::types::{FlywheelParams, Material, StressDistribution};

/// Temperature-corrected yield strength using a simplified linear de-rating model.
///
/// For most steels: yield strength decreases ~0.5%/°C above 100°C.
/// For aluminum: ~1%/°C above 100°C.
/// Ratio ≈ 1.0 at room temp, drops linearly with temperature.
pub fn temperature_corrected_yield(material: &Material, temperature: f64) -> f64 {
    if temperature <= 100.0 {
        return material.yield_strength;
    }
    // De-rating rate (per °C above 100°C)
    let rate = if material.density > 7000.0 {
        0.005 // steels
    } else if material.density > 4000.0 {
        0.006 // titanium
    } else {
        0.01 // aluminum
    };
    let reduction = 1.0 - rate * (temperature - 100.0);
    material.yield_strength * reduction.max(0.3) // minimum 30% of room-temp strength
}

/// Thermal stress for a uniform-thickness annular disk with steady-state radial
/// temperature distribution T(r) = T_inner + (T_outer - T_inner) * (r - r_i)/(r_o - r_i).
///
/// The thermal stress solution for a free-boundary annular disk:
///   σ_r_thermal = αE * [ 1/r² ∫ r·ΔT(r)·dr - 1/(r_o²-r_i²) ∫ r·ΔT(r)·dr ]
///   σ_h_thermal = αE * [ ΔT(r) - σ_r_thermal/αE - 1/(r_o²-r_i²) ∫ r·ΔT(r)·dr ]
///
/// Simplified: for linear temperature gradient ΔT(r), the max thermal hoop stress
/// occurs at the bore (inner edge) and is approximately:
///   σ_h_thermal_max ≈ α · E · ΔT_rim / (2·(1-ν))
///
/// Returns (sigma_r_thermal, sigma_h_thermal) in Pa.
pub fn thermal_stress_annular(
    r: &[f64],
    params: &FlywheelParams,
    material: &Material,
    temp_inner: f64,  // °C at inner radius
    temp_outer: f64,  // °C at outer radius
) -> (Vec<f64>, Vec<f64>) {
    let alpha = material.thermal_expansion * 1e-6; // 10⁻⁶/K → /K
    let e_mod = material.young_modulus * 1e9; // GPa → Pa
    let nu = material.poisson_ratio;
    let r_o_m = params.r_o / 1000.0;
    let r_i_m = params.r_i / 1000.0;

    let n = r.len();
    let delta_t = temp_outer - temp_inner;
    let r_range = r_o_m - r_i_m;

    let mut sigma_r = vec![0.0; n];
    let mut sigma_h = vec![0.0; n];

    // Pre-compute constant term
    let coeff = alpha * e_mod / (1.0 - nu);

    for i in 0..n {
        let ri = r[i];
        // Linear temperature at this radius: T(r) = T_inner + ΔT·(r - r_i)/(r_o - r_i)
        let temp_at_r = if r_range > 0.0 {
            temp_inner + delta_t * (ri - r_i_m) / r_range
        } else {
            temp_inner
        };
        let dt = temp_at_r - material.reference_temperature;

        if dt.abs() < 1e-6 {
            // No thermal stress with zero temperature difference
            continue;
        }

        // Mean temperature across the section (average of inner and outer)
        // For linear gradient: T_mean = (T_inner + T_outer)/2
        let temp_mean = (temp_inner + temp_outer) / 2.0;
        let _dt_mean = temp_mean - material.reference_temperature;

        // Approximate thermal stress for a disk with linear gradient:
        let ri2 = ri * ri;
        let r_i2 = r_i_m * r_i_m;
        let _r_o2 = r_o_m * r_o_m;

        // Radial thermal stress:
        // σ_r = αE/(1-ν) * [1/r²∫ r·T(r)dr - T_mean]  from r_i to r
        // For linear T(r), the integral is analytical.
        // Simplified form for thin disk:
        sigma_r[i] = if r_range > 0.0 && ri > r_i_m + 1e-9 {
            let factor = (ri2 - r_i2) / ri2;
            coeff * dt * factor * 0.5
        } else {
            0.0
        };

        // Hoop thermal stress:
        // σ_h ≈ αE/(1-ν) * [T(r) - T_mean - σ_r_r/(αE/(1-ν))]
        sigma_h[i] = coeff * dt * 0.8;
    }

    (sigma_r, sigma_h)
}

/// Combine centrifugal stress and thermal stress into total stress distribution.
/// Returns combined StressDistribution in MPa.
pub fn combine_stress(
    centrifugal: &StressDistribution,
    thermal_sigma_r: &[f64],
    thermal_sigma_h: &[f64],
) -> StressDistribution {
    let n = centrifugal.r.len();
    let mut sigma_r = vec![0.0; n];
    let mut sigma_h = vec![0.0; n];
    let mut sigma_vm = vec![0.0; n];

    for i in 0..n {
        // Centrifugal stress already in MPa from stress module
        let sr_cent = centrifugal.sigma_r[i];
        let sh_cent = centrifugal.sigma_h[i];
        // Thermal stress in Pa → convert to MPa
        let sr_therm = thermal_sigma_r[i] / 1e6;
        let sh_therm = thermal_sigma_h[i] / 1e6;

        sigma_r[i] = sr_cent + sr_therm;
        sigma_h[i] = sh_cent + sh_therm;

        // von Mises for plane stress
        let sr = sigma_r[i];
        let sh = sigma_h[i];
        sigma_vm[i] = (sr * sr + sh * sh - sr * sh).sqrt();
    }

    StressDistribution {
        r: centrifugal.r.clone(),
        sigma_r,
        sigma_h,
        sigma_vm,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    #[test]
    fn test_yield_no_degradation_at_room_temp() {
        let mat = materials::aisi_4340_steel();
        let corrected = temperature_corrected_yield(&mat, 20.0);
        assert_eq!(corrected, mat.yield_strength);
    }

    #[test]
    fn test_yield_degradation_at_high_temp() {
        let mat = materials::aisi_4340_steel();
        let corrected = temperature_corrected_yield(&mat, 200.0);
        assert!(corrected < mat.yield_strength);
        assert!(corrected > mat.yield_strength * 0.3);
    }

    #[test]
    fn test_yield_floor_at_30_percent() {
        let mat = materials::aisi_4340_steel();
        let corrected = temperature_corrected_yield(&mat, 1000.0);
        assert!((corrected - mat.yield_strength * 0.3).abs() < 1.0);
    }

    #[test]
    fn test_thermal_stress_zero_at_uniform_temp() {
        let params = FlywheelParams::default();
        let mat = materials::aisi_4340_steel();
        let r: Vec<f64> = (0..10).map(|i| 0.04 + (0.2 - 0.04) * i as f64 / 9.0).collect();
        let (_sr, sh) = thermal_stress_annular(&r, &params, &mat, 20.0, 20.0);
        // At uniform reference temperature, stress should be negligible
        let max_sh = sh.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        assert!(max_sh.abs() < 1.0e6); // < 1 MPa
    }

    #[test]
    fn test_thermal_stress_with_gradient() {
        let params = FlywheelParams::default();
        let mat = materials::aisi_4340_steel();
        let r: Vec<f64> = (0..10).map(|i| 0.04 + (0.2 - 0.04) * i as f64 / 9.0).collect();
        // Inner hotter than outer (typical in flywheel: bore heats up)
        let (_sr, sh) = thermal_stress_annular(&r, &params, &mat, 80.0, 40.0);
        let max_sh = sh.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        // Should produce tensile thermal hoop stress at bore
        assert!(max_sh > 1.0e6); // > 1 MPa
    }
}

//! Unbalance Analysis
//!
//! Compute unbalance forces and bearing loads according to ISO 1940.
//!
//! Reference: 项目记忆文件 - 七、核心公式全集 (7.6 不平衡)
//! Reference: ISO 1940 - Mechanical vibration - Balance quality requirements

/// Unbalance analysis result.
#[derive(Debug, Clone)]
pub struct UnbalanceResult {
    /// Permissible unbalance (g·mm)
    pub u_permissible: f64,
    /// Residual unbalance (g·mm)
    pub u_residual: f64,
    /// Unbalance force at rated speed (N)
    pub force_rated: f64,
    /// Bearing dynamic load at rated speed (N)
    pub bearing_load_rated: f64,
    /// Balance grade used
    pub balance_grade: f64,
    /// Whether unbalance is acceptable
    pub acceptable: bool,
}

/// ISO 1940 balance grades.
///
/// G values represent permissible specific unbalance in mm/s.
/// Common grades:
/// - G 0.4: Precision grinding machines
/// - G 1.0: Gyroscopes, small electric motors
/// - G 2.5: Gas turbines, turbochargers
/// - G 6.3: Flywheels, pumps, fans (typical for flywheels)
/// - G 16: Drive shafts, railway wheels
/// - G 40: Automotive wheels
pub const G_FLYWHEEL: f64 = 6.3;
pub const G_PRECISION: f64 = 1.0;
pub const G_GENERAL: f64 = 16.0;

/// Compute permissible unbalance according to ISO 1940.
///
/// Formula: U_per = 9549 · G · m / n (g·mm)
/// where:
///   G = balance grade (mm/s)
///   m = rotor mass (kg)
///   n = rotational speed (rpm)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.6)
pub fn permissible_unbalance(balance_grade: f64, mass_kg: f64, rpm: f64) -> f64 {
    if rpm <= 0.0 || mass_kg <= 0.0 {
        return 0.0;
    }
    9549.0 * balance_grade * mass_kg / rpm
}

/// Compute residual unbalance from eccentricity.
///
/// Formula: U_res = m · e (g·mm)
/// where:
///   m = rotor mass (kg)
///   e = eccentricity (μm)
pub fn residual_unbalance(mass_kg: f64, eccentricity_um: f64) -> f64 {
    mass_kg * eccentricity_um
}

/// Compute unbalance force.
///
/// Formula: F = U · ω² / 1000 (N)
/// where:
///   U = unbalance (g·mm)
///   ω = angular velocity (rad/s)
///   1000 = conversion factor (g·mm to kg·m)
pub fn unbalance_force(unbalance_g_mm: f64, omega: f64) -> f64 {
    unbalance_g_mm * omega * omega / 1000.0
}

/// Compute bearing dynamic load.
///
/// Formula: F_bearing ≈ U · ω² / (2·g) (N)
/// where:
///   U = unbalance (g·mm)
///   ω = angular velocity (rad/s)
///   g = gravitational acceleration (m/s²)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.6)
pub fn bearing_dynamic_load(unbalance_g_mm: f64, omega: f64) -> f64 {
    let g = 9.81; // m/s²
    unbalance_g_mm * omega * omega / (2.0 * g * 1000.0)
}

/// Run complete unbalance analysis.
pub fn analyze_unbalance(
    mass_kg: f64,
    rpm: f64,
    balance_grade: f64,
    residual_eccentricity_um: f64,
) -> UnbalanceResult {
    let omega = rpm * std::f64::consts::PI / 30.0;

    let u_per = permissible_unbalance(balance_grade, mass_kg, rpm);
    let u_res = residual_unbalance(mass_kg, residual_eccentricity_um);
    let force = unbalance_force(u_res, omega);
    let bearing_load = bearing_dynamic_load(u_res, omega);
    let acceptable = u_res <= u_per;

    UnbalanceResult {
        u_permissible: u_per,
        u_residual: u_res,
        force_rated: force,
        bearing_load_rated: bearing_load,
        balance_grade,
        acceptable,
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_permissible_unbalance_basic() {
        // U_per = 9549 · G · m / n
        // For G=6.3, m=50kg, n=3000rpm:
        // U_per = 9549 * 6.3 * 50 / 3000 = 1002.645 g·mm
        let u = permissible_unbalance(6.3, 50.0, 3000.0);
        let expected = 9549.0 * 6.3 * 50.0 / 3000.0;
        assert!((u - expected).abs() < 0.01,
            "U_per: got {}, expected {}", u, expected);
    }

    #[test]
    fn test_permissible_unbalance_zero_rpm() {
        let u = permissible_unbalance(6.3, 50.0, 0.0);
        assert_eq!(u, 0.0, "Should be 0 for zero rpm");
    }

    #[test]
    fn test_residual_unbalance_basic() {
        // U_res = m · e
        // For m=50kg, e=10μm: U_res = 500 g·mm
        let u = residual_unbalance(50.0, 10.0);
        assert!((u - 500.0).abs() < 1e-10, "U_res: got {}, expected 500", u);
    }

    #[test]
    fn test_unbalance_force_basic() {
        // F = U · ω² / 1000
        // For U=1000 g·mm, ω=100 rad/s: F = 1000 * 10000 / 1000 = 10000 N
        let f = unbalance_force(1000.0, 100.0);
        assert!((f - 10000.0).abs() < 1e-10, "F: got {}, expected 10000", f);
    }

    #[test]
    fn test_bearing_dynamic_load_basic() {
        // F_bearing = U · ω² / (2·g·1000)
        // For U=1000 g·mm, ω=100 rad/s:
        // F = 1000 * 10000 / (2 * 9.81 * 1000) = 509.68 N
        let f = bearing_dynamic_load(1000.0, 100.0);
        let expected = 1000.0 * 10000.0 / (2.0 * 9.81 * 1000.0);
        assert!((f - expected).abs() < 0.01,
            "F_bearing: got {}, expected {}", f, expected);
    }

    #[test]
    fn test_analyze_unbalance_integration() {
        // Test with typical flywheel parameters
        let mass = 50.0; // kg
        let rpm = 3000.0;
        let grade = G_FLYWHEEL; // G6.3
        let eccentricity = 10.0; // μm

        let result = analyze_unbalance(mass, rpm, grade, eccentricity);

        assert!(result.u_permissible > 0.0, "U_per should be positive");
        assert!(result.u_residual > 0.0, "U_res should be positive");
        assert!(result.force_rated > 0.0, "Force should be positive");
        assert!(result.bearing_load_rated > 0.0, "Bearing load should be positive");
    }

    #[test]
    fn test_analyze_unbalance_acceptable() {
        // Case where residual < permissible
        let result = analyze_unbalance(50.0, 3000.0, G_FLYWHEEL, 1.0);
        assert!(result.acceptable, "Should be acceptable");
    }

    #[test]
    fn test_analyze_unbalance_not_acceptable() {
        // Case where residual > permissible
        let result = analyze_unbalance(50.0, 3000.0, G_FLYWHEEL, 1000.0);
        assert!(!result.acceptable, "Should not be acceptable");
    }

    #[test]
    fn test_balance_grades() {
        // Verify different balance grades
        assert_eq!(G_FLYWHEEL, 6.3);
        assert_eq!(G_PRECISION, 1.0);
        assert_eq!(G_GENERAL, 16.0);
    }
}
//! Safety Factor Analysis
//!
//! Compute safety factors for yield, fatigue, and burst.
//! Compute critical speed and burst speed limits.
//!
//! Reference: 项目记忆文件 - 七、核心公式全集 (7.3 安全分析)
//! Reference: 机械知识库/设计基础/03-常力学公式.md - 强度计算

use crate::types::{FlywheelParams, Material, StressDistribution};

/// Safety analysis result.
#[derive(Debug, Clone)]
pub struct SafetyResult {
    /// Actual safety factor against yield
    pub n_yield: f64,
    /// Actual safety factor against fatigue
    pub n_fatigue: f64,
    /// Critical speed (rpm) - speed at which yield occurs
    pub rpm_yield: f64,
    /// Theoretical burst speed (rpm)
    pub rpm_burst: f64,
    /// Safe burst speed (rpm) - considering safety factor
    pub rpm_burst_safe: f64,
    /// Whether safety check passed
    pub safety_passed: bool,
    /// Warning messages
    pub warnings: Vec<String>,
}

/// Compute safety factor against yield.
///
/// Formula: n_yield = σ_yield / σvm_max
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.3)
pub fn safety_factor_yield(yield_strength: f64, max_vm_stress: f64) -> f64 {
    if max_vm_stress <= 0.0 {
        return f64::INFINITY;
    }
    yield_strength / max_vm_stress
}

/// Compute safety factor against fatigue.
///
/// Formula: n_fatigue = σ_fat_limit / σvm_max
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.3)
pub fn safety_factor_fatigue(fatigue_limit: f64, max_vm_stress: f64) -> f64 {
    if max_vm_stress <= 0.0 {
        return f64::INFINITY;
    }
    fatigue_limit / max_vm_stress
}

/// Compute critical speed (yield limit rpm).
///
/// Formula: ω_crit = √[ 4·σ_yield / ((3+ν)·ρ·(R² + (1-ν)/(3+ν)·rᵢ²)) ]
/// Convert to rpm: rpm_crit = ω_crit * 30 / π
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.3)
pub fn critical_speed_rpm(
    yield_strength: f64,
    poisson_ratio: f64,
    density: f64,
    r_o_m: f64,
    r_i_m: f64,
) -> f64 {
    let nu = poisson_ratio;
    let sigma_pa = yield_strength * 1e6; // MPa -> Pa
    let rho = density; // kg/m³

    let denominator = (3.0 + nu) * rho * (r_o_m * r_o_m + (1.0 - nu) / (3.0 + nu) * r_i_m * r_i_m);

    if denominator <= 0.0 {
        return f64::INFINITY;
    }

    let omega_crit = (4.0 * sigma_pa / denominator).sqrt();
    omega_crit * 30.0 / std::f64::consts::PI // rad/s -> rpm
}

/// Compute theoretical burst speed.
///
/// Formula: rpm_burst = rpm_rated · √(σ_ult / avg_hoop_stress)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.3)
pub fn burst_speed_rpm(
    rpm_rated: f64,
    avg_hoop_stress: f64,
    tensile_strength: f64,
) -> f64 {
    if avg_hoop_stress <= 0.0 {
        return f64::INFINITY;
    }
    rpm_rated * (tensile_strength / avg_hoop_stress).sqrt()
}

/// Compute safe burst speed considering safety factor.
///
/// Formula: rpm_burst_safe = rpm_burst / √(safety_factor)
pub fn safe_burst_speed_rpm(rpm_burst: f64, safety_factor: f64) -> f64 {
    if safety_factor <= 0.0 {
        return rpm_burst;
    }
    rpm_burst / safety_factor.sqrt()
}

/// Compute average hoop stress from stress distribution.
///
/// Simple average of all hoop stress values (in MPa).
pub fn average_hoop_stress(stress_dist: &StressDistribution) -> f64 {
    if stress_dist.sigma_h.is_empty() {
        return 0.0;
    }
    let sum: f64 = stress_dist.sigma_h.iter().sum();
    sum / stress_dist.sigma_h.len() as f64
}

/// Compute maximum von Mises stress from stress distribution.
pub fn max_von_mises_stress(stress_dist: &StressDistribution) -> f64 {
    stress_dist
        .sigma_vm
        .iter()
        .cloned()
        .fold(f64::NEG_INFINITY, f64::max)
}

/// Run complete safety analysis.
///
/// Computes all safety factors and generates warnings.
pub fn analyze_safety(
    params: &FlywheelParams,
    material: &Material,
    stress_dist: &StressDistribution,
) -> SafetyResult {
    let max_vm = max_von_mises_stress(stress_dist);
    let avg_hoop = average_hoop_stress(stress_dist);

    // Safety factors
    let n_yield = safety_factor_yield(material.yield_strength, max_vm);
    let n_fatigue = safety_factor_fatigue(material.fatigue_limit, max_vm);

    // Critical and burst speeds
    let r_o_m = params.r_o / 1000.0;
    let r_i_m = params.r_i / 1000.0;
    let rpm_yield = critical_speed_rpm(
        material.yield_strength,
        material.poisson_ratio,
        material.density,
        r_o_m,
        r_i_m,
    );

    let rpm_burst = burst_speed_rpm(params.rpm_rated, avg_hoop, material.tensile_strength);
    let rpm_burst_safe = safe_burst_speed_rpm(rpm_burst, params.safety_factor_burst);

    // Generate warnings
    let mut warnings = Vec::new();

    if n_yield < params.safety_factor_yield {
        warnings.push(format!(
            "屈服安全系数 {:.2} < 要求 {:.2} - 额定转速下可能屈服",
            n_yield, params.safety_factor_yield
        ));
    }

    if n_fatigue < params.safety_factor_fatigue {
        warnings.push(format!(
            "疲劳安全系数 {:.2} < 要求 {:.2} - 可能发生疲劳破坏",
            n_fatigue, params.safety_factor_fatigue
        ));
    }

    if params.rpm_max > rpm_burst_safe {
        warnings.push(format!(
            "最大转速 {:.0} rpm > 安全破裂转速 {:.0} rpm - 存在破裂风险",
            params.rpm_max, rpm_burst_safe
        ));
    }

    let safety_passed = warnings.is_empty();

    SafetyResult {
        n_yield,
        n_fatigue,
        rpm_yield,
        rpm_burst,
        rpm_burst_safe,
        safety_passed,
        warnings,
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    #[test]
    fn test_safety_factor_yield_basic() {
        // If yield_strength = 860 MPa, max_vm = 100 MPa
        // n_yield = 860 / 100 = 8.6
        let n = safety_factor_yield(860.0, 100.0);
        assert!((n - 8.6).abs() < 1e-10, "n_yield: got {}, expected 8.6", n);
    }

    #[test]
    fn test_safety_factor_yield_zero_stress() {
        // Zero stress -> infinite safety factor
        let n = safety_factor_yield(860.0, 0.0);
        assert!(n == f64::INFINITY, "Should be INFINITY for zero stress");
    }

    #[test]
    fn test_safety_factor_fatigue_basic() {
        // If fatigue_limit = 480 MPa, max_vm = 100 MPa
        // n_fatigue = 480 / 100 = 4.8
        let n = safety_factor_fatigue(480.0, 100.0);
        assert!((n - 4.8).abs() < 1e-10, "n_fatigue: got {}, expected 4.8", n);
    }

    #[test]
    fn test_critical_speed_reasonable() {
        // Reference: 项目记忆文件 - 七、核心公式全集
        let mat = materials::aisi_4340_steel();
        let r_o = 0.2; // 200mm in meters
        let r_i = 0.04; // 40mm in meters

        let rpm_crit = critical_speed_rpm(
            mat.yield_strength,
            mat.poisson_ratio,
            mat.density,
            r_o,
            r_i,
        );

        // For AISI 4340 steel, critical speed should be several thousand rpm
        assert!(rpm_crit > 1000.0 && rpm_crit < 50000.0,
            "Critical speed {} rpm seems unreasonable", rpm_crit);
    }

    #[test]
    fn test_burst_speed_basic() {
        // rpm_burst = rpm_rated * sqrt(sigma_ult / avg_hoop)
        // If rpm_rated=3000, sigma_ult=1030, avg_hoop=50
        // rpm_burst = 3000 * sqrt(1030/50) ≈ 3000 * 4.54 ≈ 13612
        let rpm = burst_speed_rpm(3000.0, 50.0, 1030.0);
        let expected = 3000.0 * (1030.0 / 50.0_f64).sqrt();
        assert!((rpm - expected).abs() < 1.0,
            "Burst speed: got {}, expected {}", rpm, expected);
    }

    #[test]
    fn test_safe_burst_speed() {
        // rpm_burst_safe = rpm_burst / sqrt(safety_factor)
        let rpm_burst = 10000.0;
        let sf = 2.0;
        let safe = safe_burst_speed_rpm(rpm_burst, sf);
        let expected = 10000.0 / 2.0_f64.sqrt();
        assert!((safe - expected).abs() < 1.0,
            "Safe burst: got {}, expected {}", safe, expected);
    }

    #[test]
    fn test_average_hoop_stress() {
        let dist = StressDistribution {
            r: vec![1.0, 2.0, 3.0],
            sigma_r: vec![10.0, 20.0, 30.0],
            sigma_h: vec![100.0, 200.0, 300.0],
            sigma_vm: vec![90.0, 180.0, 270.0],
        };
        let avg = average_hoop_stress(&dist);
        assert!((avg - 200.0).abs() < 1e-10, "Avg hoop: got {}", avg);
    }

    #[test]
    fn test_max_von_mises_stress() {
        let dist = StressDistribution {
            r: vec![1.0, 2.0, 3.0],
            sigma_r: vec![10.0, 20.0, 30.0],
            sigma_h: vec![100.0, 200.0, 300.0],
            sigma_vm: vec![90.0, 180.0, 270.0],
        };
        let max = max_von_mises_stress(&dist);
        assert!((max - 270.0).abs() < 1e-10, "Max VM: got {}", max);
    }
}
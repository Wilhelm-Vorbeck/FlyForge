//! Energy Analysis
//!
//! Compute energy storage characteristics for flywheel.
//!
//! Reference: 项目记忆文件 - 七、核心公式全集 (7.4 储能)
//! Reference: 机械知识库/设计基础/03-常力学公式.md

/// Energy analysis result.
#[derive(Debug, Clone)]
pub struct EnergyResult {
    /// Stored energy at rated speed (kJ)
    pub energy_rated: f64,
    /// Stored energy at max speed (kJ)
    pub energy_max: f64,
    /// Stored energy at min speed (kJ)
    pub energy_min: f64,
    /// Usable energy window (kJ) = E(max) - E(min)
    pub energy_usable: f64,
    /// Specific energy (Wh/kg)
    pub specific_energy: f64,
    /// Specific power (W/kg) at rated speed
    pub specific_power: f64,
    /// Speed fluctuation coefficient
    pub speed_fluctuation: f64,
}

/// Compute kinetic energy.
///
/// Formula: E = 0.5 · J · ω² (J)
///
/// Input: inertia (kg·m²), omega (rad/s)
/// Output: energy (J)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.4)
pub fn kinetic_energy(inertia: f64, omega: f64) -> f64 {
    0.5 * inertia * omega * omega
}

/// Compute specific energy (energy density).
///
/// Formula: u_m = E / m (Wh/kg = J / 3600 / m)
///
/// Input: energy (J), mass (kg)
/// Output: specific energy (Wh/kg)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.4)
pub fn specific_energy(energy_j: f64, mass_kg: f64) -> f64 {
    if mass_kg <= 0.0 {
        return 0.0;
    }
    energy_j / 3600.0 / mass_kg
}

/// Compute usable energy window.
///
/// Formula: E_usable = 0.5 · J · (ω_max² - ω_min²)
///
/// Input: inertia (kg·m²), omega_max (rad/s), omega_min (rad/s)
/// Output: usable energy (J)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.4)
pub fn usable_energy(inertia: f64, omega_max: f64, omega_min: f64) -> f64 {
    0.5 * inertia * (omega_max * omega_max - omega_min * omega_min)
}

/// Compute speed fluctuation coefficient.
///
/// Formula: Cs = (ω_max - ω_min) / ω_avg
/// where ω_avg = (ω_max + ω_min) / 2
///
/// Input: rpm_max, rpm_min
/// Output: speed fluctuation coefficient (dimensionless)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.4)
pub fn speed_fluctuation_coeff(rpm_max: f64, rpm_min: f64) -> f64 {
    let avg = (rpm_max + rpm_min) / 2.0;
    if avg <= 0.0 {
        return 0.0;
    }
    (rpm_max - rpm_min) / avg
}

/// Compute specific power.
///
/// Formula: P = T · ω = (J · α) · ω
/// For simplified calculation: P = E / t_charge
///
/// Input: energy (J), charge_time (s), mass (kg)
/// Output: specific power (W/kg)
pub fn specific_power(energy_j: f64, charge_time_s: f64, mass_kg: f64) -> f64 {
    if charge_time_s <= 0.0 || mass_kg <= 0.0 {
        return 0.0;
    }
    (energy_j / charge_time_s) / mass_kg
}

/// Run complete energy analysis.
pub fn analyze_energy(
    inertia: f64,
    mass: f64,
    rpm_rated: f64,
    rpm_max: f64,
    rpm_min: f64,
    charge_time_s: f64,
) -> EnergyResult {
    let pi = std::f64::consts::PI;
    let omega_rated = rpm_rated * pi / 30.0;
    let omega_max = rpm_max * pi / 30.0;
    let omega_min = rpm_min * pi / 30.0;

    let energy_rated_j = kinetic_energy(inertia, omega_rated);
    let energy_max_j = kinetic_energy(inertia, omega_max);
    let energy_min_j = kinetic_energy(inertia, omega_min);
    let energy_usable_j = usable_energy(inertia, omega_max, omega_min);

    EnergyResult {
        energy_rated: energy_rated_j / 1000.0, // J -> kJ
        energy_max: energy_max_j / 1000.0,
        energy_min: energy_min_j / 1000.0,
        energy_usable: energy_usable_j / 1000.0,
        specific_energy: specific_energy(energy_max_j, mass),
        specific_power: specific_power(energy_rated_j, charge_time_s, mass),
        speed_fluctuation: speed_fluctuation_coeff(rpm_max, rpm_min),
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_kinetic_energy_basic() {
        // E = 0.5 * J * omega^2
        // For J=1.0, omega=100: E = 0.5 * 1.0 * 10000 = 5000 J
        let e = kinetic_energy(1.0, 100.0);
        assert!((e - 5000.0).abs() < 1e-10, "Energy: got {}, expected 5000", e);
    }

    #[test]
    fn test_specific_energy_conversion() {
        // u_m = E / m (Wh/kg)
        // For E=3600 J, m=1 kg: u_m = 3600/3600/1 = 1 Wh/kg
        let se = specific_energy(3600.0, 1.0);
        assert!((se - 1.0).abs() < 1e-10, "Specific energy: got {}, expected 1", se);
    }

    #[test]
    fn test_specific_energy_zero_mass() {
        let se = specific_energy(1000.0, 0.0);
        assert_eq!(se, 0.0, "Should be 0 for zero mass");
    }

    #[test]
    fn test_usable_energy() {
        // E_usable = 0.5 * J * (omega_max^2 - omega_min^2)
        let j = 1.0;
        let omega_max = 100.0;
        let omega_min = 50.0;
        let e = usable_energy(j, omega_max, omega_min);
        let expected = 0.5 * j * (10000.0 - 2500.0);
        assert!((e - expected).abs() < 1e-10, "Usable energy: got {}, expected {}", e, expected);
    }

    #[test]
    fn test_speed_fluctuation() {
        // Cs = (max - min) / avg
        let cs = speed_fluctuation_coeff(100.0, 80.0);
        let expected = 20.0 / 90.0;
        assert!((cs - expected).abs() < 1e-10, "Cs: got {}, expected {}", cs, expected);
    }

    #[test]
    fn test_speed_fluctuation_zero() {
        let cs = speed_fluctuation_coeff(0.0, 0.0);
        assert_eq!(cs, 0.0, "Should be 0 for zero speeds");
    }

    #[test]
    fn test_specific_power() {
        // P = E / t / m
        // For E=1000 J, t=10 s, m=5 kg: P = 1000/10/5 = 20 W/kg
        let p = specific_power(1000.0, 10.0, 5.0);
        assert!((p - 20.0).abs() < 1e-10, "Power: got {}, expected 20", p);
    }

    #[test]
    fn test_analyze_energy_integration() {
        // Integration test with realistic values
        let inertia = 1.0; // kg·m²
        let mass = 50.0; // kg
        let rpm_rated = 3000.0;
        let rpm_max = 4500.0;
        let rpm_min = 1500.0;
        let charge_time = 60.0; // 1 minute

        let result = analyze_energy(inertia, mass, rpm_rated, rpm_max, rpm_min, charge_time);

        // Energy should be positive
        assert!(result.energy_rated > 0.0, "Energy rated should be positive");
        assert!(result.energy_max > result.energy_rated, "Max energy should > rated");
        assert!(result.energy_usable > 0.0, "Usable energy should be positive");

        // Specific energy should be reasonable (0.1-100 Wh/kg for flywheels)
        assert!(result.specific_energy > 0.0 && result.specific_energy < 100.0,
            "Specific energy {} seems unreasonable", result.specific_energy);

        // Speed fluctuation should be positive
        assert!(result.speed_fluctuation > 0.0, "Speed fluctuation should be positive");
    }

    #[test]
    fn test_energy_at_3000rpm_reasonable() {
        // For J=1 kg·m² at 3000rpm: E ≈ 49.3 kJ
        let j = 1.0;
        let rpm = 3000.0;
        let omega = rpm * std::f64::consts::PI / 30.0;
        let e_kj = kinetic_energy(j, omega) / 1000.0;

        // Should be around 49 kJ
        assert!(e_kj > 48.0 && e_kj < 50.0,
            "Energy at 3000rpm: {} kJ, expected ~49 kJ", e_kj);
    }
}
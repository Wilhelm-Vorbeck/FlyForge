/// Fatigue life estimation using S-N curve (Basquin equation)
/// σ_a × N^b = C  =>  N = (C / σ_a)^(1/b)
///
/// References:
/// - Basquin OH (1910) "The exponential law of endurance tests"
/// - Shigley's Mechanical Engineering Design
use crate::types::Material;

/// Fatigue life result
#[derive(Debug, Clone)]
pub struct FatigueResult {
    /// Stress amplitude at the critical point (MPa)
    pub stress_amplitude: f64,
    /// Number of cycles to failure
    pub cycles: f64,
    /// Equivalent operating years (assuming 10 start/stop cycles per day, 365 days/year)
    pub years: f64,
    /// Fatigue safety margin: (fatigue_limit / stress_amplitude) - 1
    /// Positive = safe, negative = failure expected
    pub safety_margin: f64,
    /// Whether the component is considered to have infinite life
    /// (stress amplitude below fatigue limit)
    pub infinite_life: bool,
    /// Estimated fatigue life in human-readable form
    pub life_description: String,
}

/// Basquin S-N curve parameters for common material groups
struct SNParams {
    /// Basquin exponent b (typically 0.05–0.12 for metals)
    b: f64,
    /// Basquin constant C = σ_f' × (2N_f)^b at 10^3 cycles
    /// Approximated as C ≈ σ_uts × (1000)^b
    c: f64,
}

fn sn_params(material: &Material) -> SNParams {
    // b ≈ -0.08 for most steels, -0.10 for aluminum, -0.12 for titanium
    // Simplified selection based on material type heuristics
    let b = if material.density > 7000.0 {
        0.085 // steels
    } else if material.density > 4000.0 {
        0.12 // titanium
    } else {
        0.10 // aluminum / composites
    };

    // C approximated from ultimate tensile strength at 10^3 cycles
    // C = σ_uts × (1000)^b
    let c = material.tensile_strength * (1000.0_f64).powf(b);

    SNParams { b, c }
}

/// Compute fatigue life estimation
pub fn estimate_fatigue_life(
    material: &Material,
    max_stress_amplitude: f64, // MPa — the alternating stress at the critical point
    mean_stress: f64,          // MPa — mean stress (optional, for Goodman correction)
) -> FatigueResult {
    let params = sn_params(material);

    // Apply Goodman mean stress correction if mean_stress > 0
    // σ_a_goodman = σ_a / (1 - σ_m / σ_uts)
    let stress_amplitude = if mean_stress > 0.0 {
        max_stress_amplitude / (1.0 - mean_stress / material.tensile_strength)
    } else {
        max_stress_amplitude
    };

    // Check infinite life condition
    if stress_amplitude <= material.fatigue_limit {
        return FatigueResult {
            stress_amplitude,
            cycles: f64::INFINITY,
            years: f64::INFINITY,
            safety_margin: (material.fatigue_limit / stress_amplitude) - 1.0,
            infinite_life: true,
            life_description: "无限寿命 — 应力幅值低于疲劳极限".into(),
        };
    }

    // Basquin: N = (C / σ_a)^(1/b)
    let cycles = (params.c / stress_amplitude).powf(1.0 / params.b);

    // Convert to years: assume 10 cycles/day, 365 days/year
    let cycles_per_year = 10.0 * 365.0;
    let years = cycles / cycles_per_year;

    // Safety margin
    let safety_margin = (material.fatigue_limit / stress_amplitude) - 1.0;

    let life_description = if years > 100.0 {
        "远超设计寿命 (>100年)".into()
    } else if years > 20.0 {
        format!("设计寿命充足 ({:.1} 年)", years)
    } else if years > 5.0 {
        format!("有限寿命 ({:.0} 年), 需定期检查", years)
    } else if years > 1.0 {
        format!("⚠ 较短寿命 ({:.1} 年), 建议优化设计", years)
    } else {
        format!("❌ 疲劳失效风险 ({:.0}e{} 次循环)", cycles, (cycles.log10()).floor() as u32)
    };

    FatigueResult {
        stress_amplitude,
        cycles,
        years,
        safety_margin,
        infinite_life: false,
        life_description,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    #[test]
    fn test_infinite_life_below_fatigue_limit() {
        let mat = materials::aisi_4340_steel();
        let result = estimate_fatigue_life(&mat, 100.0, 0.0); // Below 430 MPa fatigue limit
        assert!(result.infinite_life);
        assert!(result.safety_margin > 0.0);
    }

    #[test]
    fn test_finite_life_above_fatigue_limit() {
        let mat = materials::aisi_4340_steel();
        let result = estimate_fatigue_life(&mat, 500.0, 0.0); // Above fatigue limit
        assert!(!result.infinite_life);
        assert!(result.cycles.is_finite());
        assert!(result.cycles > 1000.0);
    }

    #[test]
    fn test_goodman_correction_increases_amplitude() {
        let mat = materials::aisi_4340_steel();
        let _no_mean = estimate_fatigue_life(&mat, 440.0, 0.0);
        let with_mean = estimate_fatigue_life(&mat, 400.0, 300.0); // Goodman should increase effective amplitude
        // With mean stress, effective amplitude is larger → fewer cycles
        assert!(with_mean.stress_amplitude > 400.0);
    }

    #[test]
    fn test_aluminum_fatigue() {
        let mat = materials::aluminum_7075_t6();
        let result = estimate_fatigue_life(&mat, 200.0, 0.0);
        assert!(result.stress_amplitude > 0.0);
    }
}

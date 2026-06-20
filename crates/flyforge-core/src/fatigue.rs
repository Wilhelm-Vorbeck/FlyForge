/// Fatigue life estimation using S-N curve (Basquin equation)
/// σ_a × N^b = C  =>  N = (C / σ_a)^(1/b)
///
/// References:
/// - Basquin OH (1910) "The exponential law of endurance tests"
/// - Shigley's Mechanical Engineering Design
use crate::types::Material;

/// Mean stress correction criterion
#[derive(Debug, Clone, Copy, PartialEq, serde::Serialize, serde::Deserialize)]
pub enum FatigueCriterion {
    /// Goodman: σ_a = σ_e × (1 - σ_m/σ_u) — conservative for ductile metals
    Goodman,
    /// Gerber: σ_a = σ_e × (1 - (σ_m/σ_u)²) — parabolic, less conservative
    Gerber,
    /// Soderberg: σ_a = σ_e × (1 - σ_m/σ_y) — most conservative, uses yield strength
    Soderberg,
}

impl FatigueCriterion {
    pub fn name(&self) -> &'static str {
        match self {
            Self::Goodman => "Goodman",
            Self::Gerber => "Gerber",
            Self::Soderberg => "Soderberg",
        }
    }
    pub fn name_zh(&self) -> &'static str {
        match self {
            Self::Goodman => "Goodman (保守)",
            Self::Gerber => "Gerber (抛物线)",
            Self::Soderberg => "Soderberg (最保守)",
        }
    }
}

impl Default for FatigueCriterion {
    fn default() -> Self {
        Self::Goodman
    }
}

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

/// Compute fatigue life estimation with specified mean stress correction criterion.
///
/// Uses Goodman, Gerber, or Soderberg mean stress correction when mean_stress > 0.
pub fn estimate_fatigue_life(
    material: &Material,
    max_stress_amplitude: f64,
    mean_stress: f64,
) -> FatigueResult {
    estimate_fatigue_life_with_criterion(material, max_stress_amplitude, mean_stress, FatigueCriterion::default())
}

/// Compute fatigue life with explicit criterion selection.
pub fn estimate_fatigue_life_with_criterion(
    material: &Material,
    max_stress_amplitude: f64,
    mean_stress: f64,
    criterion: FatigueCriterion,
) -> FatigueResult {
    let params = sn_params(material);

    // Apply mean stress correction
    let stress_amplitude = if mean_stress > 0.0 {
        match criterion {
            // Goodman: σ_a_corrected = σ_a / (1 - σ_m / σ_u)
            FatigueCriterion::Goodman => {
                let denom = 1.0 - mean_stress / material.tensile_strength;
                if denom <= 0.0 { f64::INFINITY } else { max_stress_amplitude / denom }
            }
            // Gerber: σ_a_corrected = σ_a / (1 - (σ_m / σ_u)²)
            FatigueCriterion::Gerber => {
                let ratio = mean_stress / material.tensile_strength;
                let denom = 1.0 - ratio * ratio;
                if denom <= 0.0 { f64::INFINITY } else { max_stress_amplitude / denom }
            }
            // Soderberg: σ_a_corrected = σ_a / (1 - σ_m / σ_y)
            FatigueCriterion::Soderberg => {
                let denom = 1.0 - mean_stress / material.yield_strength;
                if denom <= 0.0 { f64::INFINITY } else { max_stress_amplitude / denom }
            }
        }
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

/// S-N curve data point
#[derive(Debug, Clone)]
pub struct SNCurvePoint {
    /// Number of cycles (N)
    pub cycles: f64,
    /// Stress amplitude (MPa)
    pub stress_amplitude: f64,
}

/// S-N curve with current operating point annotation
#[derive(Debug, Clone)]
pub struct SNCurveData {
    /// S-N curve points (log-spaced from 10³ to 10⁹)
    pub curve: Vec<SNCurvePoint>,
    /// Fatigue limit horizontal line (MPa)
    pub fatigue_limit: f64,
    /// Current operating stress amplitude (MPa)
    pub operating_stress: f64,
    /// Current operating cycles (N)
    pub operating_cycles: f64,
    /// Material label
    pub material_name: String,
}

/// Generate S-N curve data for a material.
///
/// Uses the Basquin equation σ_a = C · N^{-b} to generate log-spaced
/// curve points from 1e3 to 1e9 cycles.
pub fn sn_curve(
    material: &Material,
    operating_stress: f64,
) -> SNCurveData {
    let params = sn_params(material);
    let mut curve = Vec::new();

    // Generate 50 log-spaced points from 10³ to 10⁹
    let n_start = 3.0;   // log10(1000)
    let n_end = 9.0;     // log10(1e9)
    let n_points = 50;

    for i in 0..=n_points {
        let log_n = n_start + (n_end - n_start) * i as f64 / n_points as f64;
        let cycles = 10.0_f64.powf(log_n);
        let stress = params.c * cycles.powf(-params.b);
        curve.push(SNCurvePoint {
            cycles,
            stress_amplitude: stress,
        });
    }

    // Operating cycles: N = (C / σ_a)^(1/b)
    let operating_cycles = if operating_stress > 0.0 && operating_stress >= material.fatigue_limit {
        (params.c / operating_stress).powf(1.0 / params.b)
    } else {
        f64::INFINITY
    };

    SNCurveData {
        curve,
        fatigue_limit: material.fatigue_limit,
        operating_stress,
        operating_cycles,
        material_name: material.name_zh.clone(),
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

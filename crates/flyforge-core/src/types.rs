//! FlyForge Type Definitions
//!
//! Core types for flywheel parameters, material properties, and simulation results.
//! Design philosophy: define types first, then write computation logic.
//!
//! Reference: CamForge types.rs pattern, but with flywheel domain model.

use serde::{Deserialize, Serialize};

// ============================================================
// Flywheel Type Enum
// ============================================================

/// Flywheel geometry type.
/// Different section shapes have different stress distribution formulas.
/// Serialized as integer (consistent with frontend TypeScript enum).
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum FlywheelType {
    /// Solid disk - simplest, for low-speed scenarios
    #[default]
    SolidDisk = 1,
    /// Annular ring (constant thickness) - most common
    AnnularRing = 2,
    /// Tapered disk - mass-optimized
    TaperedDisk = 3,
    /// Constant strength (hyperbolic profile) - uniform stress distribution
    ConstantStrength = 4,
    /// Multi-layer composite (rim + web + hub) - carbon fiber etc.
    MultiLayerComposite = 5,
}

impl FlywheelType {
    /// Get English name
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::SolidDisk => "Solid Disk",
            Self::AnnularRing => "Annular Ring",
            Self::TaperedDisk => "Tapered Disk",
            Self::ConstantStrength => "Constant Strength",
            Self::MultiLayerComposite => "Multi-Layer Composite",
        }
    }

    /// Get Chinese name
    pub fn as_str_zh(&self) -> &'static str {
        match self {
            Self::SolidDisk => "实心圆盘",
            Self::AnnularRing => "环形轮（等厚度）",
            Self::TaperedDisk => "锥形盘",
            Self::ConstantStrength => "等强度轮",
            Self::MultiLayerComposite => "多层复合轮",
        }
    }

    /// Whether this type has a center bore
    pub fn has_bore(&self) -> bool {
        matches!(
            self,
            Self::AnnularRing | Self::TaperedDisk | Self::ConstantStrength | Self::MultiLayerComposite
        )
    }
}

// ============================================================
// Material Properties
// ============================================================

/// Flywheel material properties.
///
/// Material properties directly determine the flywheel's ultimate speed and energy storage capacity.
/// Built-in common material data, also supports custom materials.
///
/// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md
/// Reference: 机械知识库/设计基础/06-机械工程材料-非金属.md
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Material {
    /// Material name (e.g., "AISI 4340 Steel")
    pub name: String,
    /// Chinese name
    pub name_zh: String,
    /// Density (kg/m³)
    pub density: f64,
    /// Young's Modulus (GPa)
    pub young_modulus: f64,
    /// Poisson's Ratio (dimensionless)
    pub poisson_ratio: f64,
    /// Yield Strength (MPa)
    pub yield_strength: f64,
    /// Ultimate Tensile Strength (MPa)
    pub tensile_strength: f64,
    /// Fatigue Limit (MPa) - endurance limit for 10^7 cycles
    pub fatigue_limit: f64,
    /// Specific Strength (MPa·m³/kg) = yield_strength / density * 1000
    /// Core metric for flywheel evaluation
    pub specific_strength: f64,
}

impl Material {
    /// Compute specific strength from yield strength and density
    /// Formula: specific_strength = yield_strength / density * 1000
    pub fn compute_specific_strength(yield_strength: f64, density: f64) -> f64 {
        if density <= 0.0 {
            return 0.0;
        }
        yield_strength / density * 1000.0
    }
}

/// Built-in material database.
///
/// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md
/// Reference: 项目记忆文件 - 六、内置材料数据库（12种）
pub mod materials {
    use super::Material;

    /// AISI 4340 Steel (default)
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 合金结构钢
    pub fn aisi_4340_steel() -> Material {
        let ys = 860.0;
        let density = 7850.0;
        Material {
            name: "AISI 4340 Steel".into(),
            name_zh: "AISI 4340 合金钢".into(),
            density,
            young_modulus: 205.0,
            poisson_ratio: 0.29,
            yield_strength: ys,
            tensile_strength: 1030.0,
            fatigue_limit: 480.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Aluminum 7075-T6
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 铝及铝合金
    pub fn aluminum_7075_t6() -> Material {
        let ys = 503.0;
        let density = 2810.0;
        Material {
            name: "Aluminum 7075-T6".into(),
            name_zh: "7075-T6 铝合金".into(),
            density,
            young_modulus: 71.7,
            poisson_ratio: 0.33,
            yield_strength: ys,
            tensile_strength: 572.0,
            fatigue_limit: 159.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Titanium Ti-6Al-4V
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 钛及钛合金
    pub fn titanium_ti6al4v() -> Material {
        let ys = 880.0;
        let density = 4430.0;
        Material {
            name: "Titanium Ti-6Al-4V".into(),
            name_zh: "Ti-6Al-4V 钛合金".into(),
            density,
            young_modulus: 113.8,
            poisson_ratio: 0.342,
            yield_strength: ys,
            tensile_strength: 950.0,
            fatigue_limit: 510.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Carbon Fiber T700/Epoxy
    /// Reference: 机械知识库/设计基础/06-机械工程材料-非金属.md
    pub fn carbon_fiber_t700() -> Material {
        let ts = 4900.0; // Composite materials primarily use tensile strength
        let density = 1800.0;
        Material {
            name: "Carbon Fiber T700/Epoxy".into(),
            name_zh: "T700 碳纤维/环氧树脂".into(),
            density,
            young_modulus: 230.0,
            poisson_ratio: 0.27,
            yield_strength: ts,
            tensile_strength: ts,
            fatigue_limit: 1500.0,
            specific_strength: Material::compute_specific_strength(ts, density),
        }
    }

    /// Q235 Structural Steel
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 碳素结构钢
    pub fn q235_steel() -> Material {
        let ys = 235.0;
        let density = 7850.0;
        Material {
            name: "Q235 Structural Steel".into(),
            name_zh: "Q235 碳素结构钢".into(),
            density,
            young_modulus: 210.0,
            poisson_ratio: 0.30,
            yield_strength: ys,
            tensile_strength: 375.0,
            fatigue_limit: 180.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// C45 Carbon Steel (45#)
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 优质碳素结构钢
    pub fn c45_carbon_steel() -> Material {
        let ys = 355.0;
        let density = 7850.0;
        Material {
            name: "C45 Carbon Steel".into(),
            name_zh: "C45 碳素结构钢（45#）".into(),
            density,
            young_modulus: 210.0,
            poisson_ratio: 0.30,
            yield_strength: ys,
            tensile_strength: 600.0,
            fatigue_limit: 280.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// AISI 4140 / 42CrMo Alloy Steel
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 合金结构钢
    pub fn aisi_4140_steel() -> Material {
        let ys = 785.0;
        let density = 7850.0;
        Material {
            name: "AISI 4140 / 42CrMo".into(),
            name_zh: "42CrMo 合金结构钢".into(),
            density,
            young_modulus: 210.0,
            poisson_ratio: 0.30,
            yield_strength: ys,
            tensile_strength: 980.0,
            fatigue_limit: 450.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// 18Ni Maraging Steel
    pub fn maraging_steel_18ni() -> Material {
        let ys = 1900.0;
        let density = 8000.0;
        Material {
            name: "18Ni Maraging Steel".into(),
            name_zh: "18Ni 马氏体时效钢".into(),
            density,
            young_modulus: 186.0,
            poisson_ratio: 0.30,
            yield_strength: ys,
            tensile_strength: 2050.0,
            fatigue_limit: 700.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Aluminum 6061-T6
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 铝及铝合金
    pub fn aluminum_6061_t6() -> Material {
        let ys = 276.0;
        let density = 2700.0;
        Material {
            name: "Aluminum 6061-T6".into(),
            name_zh: "6061-T6 铝合金".into(),
            density,
            young_modulus: 68.9,
            poisson_ratio: 0.33,
            yield_strength: ys,
            tensile_strength: 310.0,
            fatigue_limit: 96.5,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Ductile Iron QT600-3
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md
    pub fn ductile_iron_qt600() -> Material {
        let ys = 370.0;
        let density = 7100.0;
        Material {
            name: "Ductile Iron QT600-3".into(),
            name_zh: "QT600-3 球墨铸铁".into(),
            density,
            young_modulus: 169.0,
            poisson_ratio: 0.275,
            yield_strength: ys,
            tensile_strength: 600.0,
            fatigue_limit: 230.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Gray Cast Iron HT250
    /// Reference: 机械知识库/设计基础/05-机械工程材料-金属.md - 铸铁HT200
    pub fn gray_cast_iron_ht250() -> Material {
        let ys = 165.0;
        let density = 7200.0;
        Material {
            name: "Gray Cast Iron HT250".into(),
            name_zh: "HT250 灰铸铁".into(),
            density,
            young_modulus: 130.0,
            poisson_ratio: 0.26,
            yield_strength: ys,
            tensile_strength: 250.0,
            fatigue_limit: 110.0,
            specific_strength: Material::compute_specific_strength(ys, density),
        }
    }

    /// Carbon Fiber T1000/Epoxy
    /// Reference: 机械知识库/设计基础/06-机械工程材料-非金属.md
    pub fn carbon_fiber_t1000() -> Material {
        let ts = 6370.0;
        let density = 1800.0;
        Material {
            name: "Carbon Fiber T1000/Epoxy".into(),
            name_zh: "T1000 碳纤维/环氧树脂".into(),
            density,
            young_modulus: 294.0,
            poisson_ratio: 0.27,
            yield_strength: ts,
            tensile_strength: ts,
            fatigue_limit: 1900.0,
            specific_strength: Material::compute_specific_strength(ts, density),
        }
    }

    /// All built-in materials list
    pub fn all() -> Vec<Material> {
        vec![
            aisi_4340_steel(),    // 0 - default
            aluminum_7075_t6(),   // 1
            titanium_ti6al4v(),   // 2
            carbon_fiber_t700(),  // 3
            q235_steel(),         // 4
            c45_carbon_steel(),   // 5
            aisi_4140_steel(),    // 6
            maraging_steel_18ni(),// 7
            aluminum_6061_t6(),   // 8
            ductile_iron_qt600(), // 9
            gray_cast_iron_ht250(),// 10
            carbon_fiber_t1000(), // 11
        ]
    }

    /// Find material by ID string
    pub fn find_by_id(id: &str) -> Option<Material> {
        all().into_iter().find(|m| {
            let m_id = m.name.to_lowercase().replace(" ", "_").replace("/", "_");
            m_id == id || id == "aisi_4340" && m.name.contains("4340")
        })
    }

    /// Get default material (AISI 4340)
    pub fn default_material() -> Material {
        aisi_4340_steel()
    }
}

// ============================================================
// Flywheel Design Parameters
// ============================================================

/// Flywheel design parameters.
///
/// Corresponds to CamForge's CamParams - the core data model for user-adjustable design variables.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlywheelParams {
    // --- Geometry ---
    /// Outer radius (mm)
    pub r_o: f64,
    /// Inner radius (mm) - 0 for solid disk
    pub r_i: f64,
    /// Rim thickness (mm)
    pub thickness: f64,
    /// Hub outer radius (mm)
    pub r_hub: f64,
    /// Hub thickness (mm)
    pub hub_thickness: f64,

    // --- Operating Parameters ---
    /// Rated speed (rpm)
    pub rpm_rated: f64,
    /// Maximum speed (rpm)
    pub rpm_max: f64,
    /// Minimum speed (rpm) - discharge end
    pub rpm_min: f64,

    // --- Discretization ---
    /// Number of radial discretization points
    #[serde(default = "default_n_points")]
    pub n_points: usize,

    // --- Type and Material ---
    /// Flywheel geometry type
    #[serde(default)]
    pub flywheel_type: FlywheelType,
    /// Material index (references built-in material library) or custom material name
    #[serde(default = "default_material_id")]
    pub material_id: String,

    // --- Safety Factors ---
    /// Safety factor against yield
    #[serde(default = "default_safety_factor")]
    pub safety_factor_yield: f64,
    /// Safety factor against fatigue
    #[serde(default = "default_safety_factor")]
    pub safety_factor_fatigue: f64,
    /// Safety factor against burst
    #[serde(default = "default_burst_safety")]
    pub safety_factor_burst: f64,
}

fn default_n_points() -> usize {
    100
}
fn default_material_id() -> String {
    "aisi_4340".into()
}
fn default_safety_factor() -> f64 {
    1.5
}
fn default_burst_safety() -> f64 {
    2.0
}

impl Default for FlywheelParams {
    fn default() -> Self {
        Self {
            r_o: 200.0,
            r_i: 40.0,
            thickness: 50.0,
            r_hub: 60.0,
            hub_thickness: 80.0,
            rpm_rated: 3000.0,
            rpm_max: 4500.0,
            rpm_min: 1500.0,
            n_points: 100,
            flywheel_type: FlywheelType::AnnularRing,
            material_id: default_material_id(),
            safety_factor_yield: default_safety_factor(),
            safety_factor_fatigue: default_safety_factor(),
            safety_factor_burst: default_burst_safety(),
        }
    }
}

impl FlywheelParams {
    /// Validate parameters before simulation.
    ///
    /// Corresponds to CamForge's CamParams::validate() - the safety gateway before simulation.
    pub fn validate(&self) -> Result<(), String> {
        // NaN/Infinity check
        let float_fields = [
            ("r_o", self.r_o),
            ("r_i", self.r_i),
            ("thickness", self.thickness),
            ("r_hub", self.r_hub),
            ("hub_thickness", self.hub_thickness),
            ("rpm_rated", self.rpm_rated),
            ("rpm_max", self.rpm_max),
            ("rpm_min", self.rpm_min),
        ];
        for (name, val) in &float_fields {
            if !val.is_finite() {
                return Err(format!("Parameter '{}' must be finite, got {}", name, val));
            }
        }
        // Outer radius must be positive
        if self.r_o <= 0.0 {
            return Err(format!("r_o must be > 0, got {}", self.r_o));
        }
        // Inner radius cannot be negative, must be less than outer radius
        if self.r_i < 0.0 {
            return Err(format!("r_i cannot be negative, got {}", self.r_i));
        }
        if self.flywheel_type.has_bore() && self.r_i >= self.r_o {
            return Err(format!("r_i ({}) must be < r_o ({})", self.r_i, self.r_o));
        }
        // Thickness must be positive
        if self.thickness <= 0.0 {
            return Err(format!("thickness must be > 0, got {}", self.thickness));
        }
        // Speed ordering: min < rated < max
        if self.rpm_min >= self.rpm_rated {
            return Err(format!(
                "rpm_min ({}) must be < rpm_rated ({})",
                self.rpm_min, self.rpm_rated
            ));
        }
        if self.rpm_rated >= self.rpm_max {
            return Err(format!(
                "rpm_rated ({}) must be < rpm_max ({})",
                self.rpm_rated, self.rpm_max
            ));
        }
        // Speed cannot be negative
        if self.rpm_min <= 0.0 {
            return Err("rpm_min must be > 0".into());
        }
        // Discretization points range
        if self.n_points < 20 {
            return Err("n_points must be >= 20".into());
        }
        if self.n_points > 500 {
            return Err("n_points must be <= 500".into());
        }
        // Safety factors must be positive
        if self.safety_factor_yield <= 0.0
            || self.safety_factor_fatigue <= 0.0
            || self.safety_factor_burst <= 0.0
        {
            return Err("Safety factors must be positive".into());
        }
        Ok(())
    }

    /// Compute angular velocity from rpm.
    /// Formula: omega = rpm * PI / 30 (rad/s)
    pub fn omega(&self, rpm: f64) -> f64 {
        rpm * std::f64::consts::PI / 30.0
    }
}

// ============================================================
// Stress Computation Results
// ============================================================

/// Radial stress distribution (per radial node).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StressDistribution {
    /// Radial coordinates (mm)
    pub r: Vec<f64>,
    /// Radial stress sigma_r (MPa)
    pub sigma_r: Vec<f64>,
    /// Hoop stress sigma_h (MPa) - aka tangential stress sigma_theta
    pub sigma_h: Vec<f64>,
    /// von Mises equivalent stress (MPa)
    pub sigma_vm: Vec<f64>,
}

// ============================================================
// Flywheel Section (Geometry Result)
// ============================================================

/// Flywheel section geometry result from solver.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlywheelSection {
    /// Radial coordinates of section points (mm)
    pub r_points: Vec<f64>,
    /// Thickness at each radial point (mm)
    pub t_points: Vec<f64>,
    /// Cross-sectional area (mm^2)
    pub area: f64,
    /// Volume (mm^3)
    pub volume: f64,
}

// ============================================================
// Inertia Result
// ============================================================

/// Moment of inertia computation result.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InertiaResult {
    /// Mass (kg)
    pub mass: f64,
    /// Moment of inertia (kg·m^2)
    pub moment_of_inertia: f64,
}

// ============================================================
// Solver Output (Intermediate Result)
// ============================================================

/// Complete solver output containing geometry, inertia, and stress results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SolverOutput {
    /// Geometry section result
    pub geometry: FlywheelSection,
    /// Inertia result
    pub inertia: InertiaResult,
    /// Stress distribution result
    pub stress: StressDistribution,
}

// ============================================================
// Complete Flywheel Simulation Result
// ============================================================

/// Complete flywheel simulation results.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlywheelSimulation {
    // --- Basic parameter echo ---
    pub params: FlywheelParams,
    pub material: Material,

    // --- Mass properties ---
    /// Total flywheel mass (kg)
    pub mass: f64,
    /// Moment of inertia (kg·m^2)
    pub moment_of_inertia: f64,

    // --- Stress analysis (at rated speed) ---
    /// Stress distribution at rated speed
    pub stress_rated: StressDistribution,
    /// Maximum von Mises stress at rated speed (MPa)
    pub max_stress_rated: f64,
    /// Radial location of maximum stress (mm)
    pub max_stress_location: f64,

    // --- Limit speed analysis ---
    /// Yield limit rpm - speed at which von Mises at bore reaches yield
    pub rpm_yield: f64,
    /// Theoretical burst rpm - when average hoop stress reaches tensile strength
    pub rpm_burst: f64,
    /// Safe burst rpm - considering safety factor
    pub rpm_burst_safe: f64,

    // --- Energy characteristics ---
    /// Stored energy at rated speed (kJ)
    pub energy_rated: f64,
    /// Stored energy at max speed (kJ)
    pub energy_max: f64,
    /// Usable energy window (kJ) = E(max) - E(min)
    pub energy_usable: f64,
    /// Specific energy (Wh/kg)
    pub specific_energy: f64,
    /// Specific power (W/kg) at rated speed
    pub specific_power: f64,

    // --- Speed fluctuation ---
    /// Coefficient of speed fluctuation
    pub speed_fluctuation: f64,
    /// Speed-time curve sample points (rpm)
    pub rpm_curve: Vec<f64>,
    /// Corresponding time points (s)
    pub time_curve: Vec<f64>,

    // --- Safety assessment ---
    /// Actual safety factor against yield
    pub actual_safety_yield: f64,
    /// Actual safety factor against fatigue
    pub actual_safety_fatigue: f64,
    /// Overall safety assessment passed
    pub safety_passed: bool,
    /// Safety warning messages
    pub safety_warnings: Vec<String>,
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_flywheel_type_names() {
        assert_eq!(FlywheelType::SolidDisk.as_str(), "Solid Disk");
        assert_eq!(FlywheelType::SolidDisk.as_str_zh(), "实心圆盘");
        assert_eq!(FlywheelType::AnnularRing.as_str_zh(), "环形轮（等厚度）");
    }

    #[test]
    fn test_flywheel_type_has_bore() {
        assert!(!FlywheelType::SolidDisk.has_bore());
        assert!(FlywheelType::AnnularRing.has_bore());
        assert!(FlywheelType::TaperedDisk.has_bore());
        assert!(FlywheelType::ConstantStrength.has_bore());
        assert!(FlywheelType::MultiLayerComposite.has_bore());
    }

    #[test]
    fn test_material_database_count() {
        let all = materials::all();
        assert_eq!(all.len(), 12, "Expected 12 built-in materials");
    }

    #[test]
    fn test_material_specific_strength() {
        // Reference: 机械知识库/设计基础/03-常力学公式.md
        // Formula: specific_strength = yield_strength / density * 1000
        let mat = materials::aisi_4340_steel();
        let expected = 860.0 / 7850.0 * 1000.0;
        assert!(
            (mat.specific_strength - expected).abs() < 0.01,
            "Specific strength mismatch: got {}, expected {}",
            mat.specific_strength,
            expected
        );
    }

    #[test]
    fn test_material_default() {
        let mat = materials::default_material();
        assert_eq!(mat.name, "AISI 4340 Steel");
        assert_eq!(mat.density, 7850.0);
    }

    #[test]
    fn test_flywheel_params_default() {
        let params = FlywheelParams::default();
        assert_eq!(params.r_o, 200.0);
        assert_eq!(params.flywheel_type, FlywheelType::AnnularRing);
        assert_eq!(params.n_points, 100);
    }

    #[test]
    fn test_flywheel_params_validate_valid() {
        let params = FlywheelParams::default();
        assert!(params.validate().is_ok(), "Default params should be valid");
    }

    #[test]
    fn test_flywheel_params_validate_invalid_outer_radius() {
        let params = FlywheelParams {
            r_o: -10.0,
            ..Default::default()
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_flywheel_params_validate_invalid_inner_radius() {
        let params = FlywheelParams {
            r_i: 300.0, // r_i > r_o
            ..Default::default()
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_flywheel_params_validate_invalid_speed_order() {
        let params = FlywheelParams {
            rpm_min: 5000.0,
            rpm_rated: 3000.0,
            rpm_max: 6000.0,
            ..Default::default()
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_flywheel_params_validate_nan() {
        let params = FlywheelParams {
            r_o: f64::NAN,
            ..Default::default()
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_flywheel_params_validate_n_points_range() {
        // Too few points
        let params = FlywheelParams {
            n_points: 10,
            ..Default::default()
        };
        assert!(params.validate().is_err());

        // Too many points
        let params = FlywheelParams {
            n_points: 600,
            ..Default::default()
        };
        assert!(params.validate().is_err());
    }

    #[test]
    fn test_omega_conversion() {
        // Reference: 机械知识库/设计基础/03-常力学公式.md
        // Formula: omega = 2 * PI * n / 60
        let params = FlywheelParams::default();
        let omega = params.omega(3000.0);
        let expected = 3000.0 * std::f64::consts::PI / 30.0;
        assert!(
            (omega - expected).abs() < 1e-10,
            "Omega conversion mismatch: got {}, expected {}",
            omega,
            expected
        );
    }
}
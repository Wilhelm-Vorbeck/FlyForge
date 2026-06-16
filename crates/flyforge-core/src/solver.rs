//! Flywheel Solver Architecture
//!
//! trait-based solver interface and factory registry.
//! This is the core architectural pattern for FlyForge - each flywheel type
//! implements the FlywheelSolver trait independently.
//!
//! Reference: 项目记忆文件 - 四、核心架构设计（关键经验）
//! Reference: CamForge architecture pattern

use crate::energy;
use crate::geometry;
use crate::inertia;
use crate::safety;
use crate::stress;
use crate::types::{
    FlywheelParams, FlywheelSimulation, FlywheelSection, FlywheelType, InertiaResult, Material,
    SolverOutput, StressDistribution,
};

// ============================================================
// FlywheelSolver Trait (Unified Computation Interface)
// ============================================================

/// Unified computation interface for all flywheel types.
///
/// Each flywheel geometry type implements this trait independently.
/// This eliminates the need for match/if-else chains scattered across files.
///
/// Extension: To add a new flywheel type:
/// 1. Add variant to FlywheelType enum
/// 2. Implement FlywheelSolver trait for the new type
/// 3. Register in SolverRegistry::new()
pub trait FlywheelSolver: Send + Sync {
    /// Compute flywheel section geometry
    fn compute_section(
        &self,
        params: &FlywheelParams,
        material: &Material,
    ) -> Result<FlywheelSection, String>;

    /// Compute mass and moment of inertia
    /// Reference: 机械知识库/公式计算/01-几何体计算.md - 转动惯量计算
    fn compute_inertia(
        &self,
        params: &FlywheelParams,
        section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String>;

    /// Compute stress distribution at given angular velocity
    /// Reference: 机械知识库/设计基础/03-常力学公式.md - 应力分析
    fn compute_stress(
        &self,
        params: &FlywheelParams,
        section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution;

    /// Whether this flywheel type has a center bore
    fn has_bore(&self) -> bool;

    /// English name of this solver
    fn name(&self) -> &'static str;

    /// Chinese name of this solver
    fn name_zh(&self) -> &'static str;
}

// ============================================================
// Concrete Solver Implementations (Placeholder)
// ============================================================

/// Solid disk solver - simplest flywheel type
pub struct SolidDiskSolver;

impl FlywheelSolver for SolidDiskSolver {
    fn compute_section(
        &self,
        params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Ok(geometry::section_solid_disk(params))
    }

    fn compute_inertia(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String> {
        // Reference: J = 0.5 * m * R^2
        Ok(inertia::mass_inertia_solid(params, material))
    }

    fn compute_stress(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution {
        stress::compute_stress_distribution(params, material, omega)
    }

    fn has_bore(&self) -> bool {
        false
    }

    fn name(&self) -> &'static str {
        "Solid Disk"
    }

    fn name_zh(&self) -> &'static str {
        "实心圆盘"
    }
}

/// Annular ring solver - most common flywheel type
pub struct AnnularRingSolver;

impl FlywheelSolver for AnnularRingSolver {
    fn compute_section(
        &self,
        params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Ok(geometry::section_annular_ring(params))
    }

    fn compute_inertia(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String> {
        // Reference: J = 0.5 * m * (R1^2 + R2^2)
        Ok(inertia::mass_inertia_annular(params, material))
    }

    fn compute_stress(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution {
        stress::compute_stress_distribution(params, material, omega)
    }

    fn has_bore(&self) -> bool {
        true
    }

    fn name(&self) -> &'static str {
        "Annular Ring"
    }

    fn name_zh(&self) -> &'static str {
        "环形轮（等厚度）"
    }
}

/// Tapered disk solver - mass-optimized flywheel
pub struct TaperedDiskSolver;

impl FlywheelSolver for TaperedDiskSolver {
    fn compute_section(
        &self,
        params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Ok(geometry::section_tapered_disk(params))
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String> {
        // Variable thickness -> numerical integration
        Ok(inertia::mass_inertia_numerical(section, material))
    }

    fn compute_stress(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution {
        stress::compute_stress_distribution(params, material, omega)
    }

    fn has_bore(&self) -> bool {
        true
    }

    fn name(&self) -> &'static str {
        "Tapered Disk"
    }

    fn name_zh(&self) -> &'static str {
        "锥形盘"
    }
}

/// Constant strength solver - uniform stress distribution
pub struct ConstantStrengthSolver;

impl FlywheelSolver for ConstantStrengthSolver {
    fn compute_section(
        &self,
        params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Ok(geometry::section_constant_strength(params))
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String> {
        // Hyperbolic profile -> numerical integration
        Ok(inertia::mass_inertia_numerical(section, material))
    }

    fn compute_stress(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution {
        stress::compute_stress_distribution(params, material, omega)
    }

    fn has_bore(&self) -> bool {
        true
    }

    fn name(&self) -> &'static str {
        "Constant Strength"
    }

    fn name_zh(&self) -> &'static str {
        "等强度轮"
    }
}

/// Multi-layer composite solver (rim + web + hub)
pub struct MultiLayerCompositeSolver;

impl FlywheelSolver for MultiLayerCompositeSolver {
    fn compute_section(
        &self,
        params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Ok(geometry::section_multi_layer(params))
    }

    fn compute_inertia(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
    ) -> Result<InertiaResult, String> {
        // Reference: J_total = J_rim + J_web + J_hub
        Ok(inertia::mass_inertia_multi_layer(params, material))
    }

    fn compute_stress(
        &self,
        params: &FlywheelParams,
        _section: &FlywheelSection,
        material: &Material,
        omega: f64,
    ) -> StressDistribution {
        stress::compute_stress_distribution(params, material, omega)
    }

    fn has_bore(&self) -> bool {
        true
    }

    fn name(&self) -> &'static str {
        "Multi-Layer Composite"
    }

    fn name_zh(&self) -> &'static str {
        "多层复合轮"
    }
}

// ============================================================
// Solver Registry (Factory Pattern)
// ============================================================

/// Factory registry for flywheel solvers.
///
/// This is the SINGLE dispatch point for flywheel types.
/// To add a new flywheel type, register its solver here.
///
/// Reference: 项目记忆文件 - 四、核心架构设计
pub struct SolverRegistry {
    solvers: Vec<(FlywheelType, Box<dyn FlywheelSolver>)>,
}

impl SolverRegistry {
    /// Create a new registry with all built-in solvers
    pub fn new() -> Self {
        Self {
            solvers: vec![
                (FlywheelType::SolidDisk, Box::new(SolidDiskSolver)),
                (FlywheelType::AnnularRing, Box::new(AnnularRingSolver)),
                (FlywheelType::TaperedDisk, Box::new(TaperedDiskSolver)),
                (FlywheelType::ConstantStrength, Box::new(ConstantStrengthSolver)),
                (
                    FlywheelType::MultiLayerComposite,
                    Box::new(MultiLayerCompositeSolver),
                ),
            ],
        }
    }

    /// Register a custom solver for a flywheel type
    pub fn register(&mut self, ft: FlywheelType, solver: Box<dyn FlywheelSolver>) {
        self.solvers.push((ft, solver));
    }

    /// Get solver for a specific flywheel type
    pub fn get_solver(&self, ft: &FlywheelType) -> Result<&dyn FlywheelSolver, String> {
        self.solvers
            .iter()
            .find(|(t, _)| t == ft)
            .map(|(_, s)| s.as_ref())
            .ok_or_else(|| format!("No solver registered for flywheel type: {:?}", ft))
    }

    /// Run complete computation pipeline: Geometry -> Inertia -> Stress
    ///
    /// This is the main entry point for flywheel simulation.
    ///
    /// Reference: 项目记忆文件 - SolverRegistry::solve()
    pub fn solve(
        &self,
        params: &FlywheelParams,
        material: &Material,
    ) -> Result<SolverOutput, String> {
        // Step 1: Validate parameters
        params.validate()?;

        // Step 2: Get solver for this flywheel type
        let solver = self.get_solver(&params.flywheel_type)?;

        // Step 3: Compute section geometry
        let section = solver.compute_section(params, material)?;

        // Step 4: Compute mass and inertia
        let inertia = solver.compute_inertia(params, &section, material)?;

        // Step 5: Compute stress at rated speed
        let omega = params.omega(params.rpm_rated);
        let stress = solver.compute_stress(params, &section, material, omega);

        // Step 6: Return complete output
        Ok(SolverOutput {
            geometry: section,
            inertia,
            stress,
        })
    }

    /// Run complete flywheel simulation with safety and energy analysis.
    ///
    /// This generates the full FlywheelSimulation result including:
    /// - Geometry and inertia
    /// - Stress distribution at rated speed
    /// - Safety analysis (yield, fatigue, burst)
    /// - Energy analysis (specific energy, usable energy)
    ///
    /// Reference: 项目记忆文件 - 八、完整功能需求
    pub fn simulate(
        &self,
        params: &FlywheelParams,
        material: &Material,
    ) -> Result<FlywheelSimulation, String> {
        // Step 1: Run basic computation pipeline
        let output = self.solve(params, material)?;

        // Step 2: Safety analysis
        let safety_result = safety::analyze_safety(params, material, &output.stress);

        // Step 3: Energy analysis
        // Default charge time: 60 seconds
        let charge_time = 60.0;
        let energy_result = energy::analyze_energy(
            output.inertia.moment_of_inertia,
            output.inertia.mass,
            params.rpm_rated,
            params.rpm_max,
            params.rpm_min,
            charge_time,
        );

        // Step 4: Generate rpm-time curve (simplified)
        let (time_curve, rpm_curve) = generate_rpm_curve(
            params.rpm_min,
            params.rpm_max,
            charge_time,
            charge_time * 2.0,
            100,
        );

        // Step 5: Find max stress and location
        let max_vm = output
            .stress
            .sigma_vm
            .iter()
            .enumerate()
            .max_by(|(_, a), (_, b)| a.partial_cmp(b).unwrap())
            .map(|(idx, &val)| (idx, val))
            .unwrap_or((0, 0.0));

        // Step 6: Build complete simulation result
        Ok(FlywheelSimulation {
            params: params.clone(),
            material: material.clone(),
            mass: output.inertia.mass,
            moment_of_inertia: output.inertia.moment_of_inertia,
            stress_rated: output.stress.clone(),
            max_stress_rated: max_vm.1,
            max_stress_location: output.stress.r[max_vm.0],
            rpm_yield: safety_result.rpm_yield,
            rpm_burst: safety_result.rpm_burst,
            rpm_burst_safe: safety_result.rpm_burst_safe,
            energy_rated: energy_result.energy_rated,
            energy_max: energy_result.energy_max,
            energy_usable: energy_result.energy_usable,
            specific_energy: energy_result.specific_energy,
            specific_power: energy_result.specific_power,
            speed_fluctuation: energy_result.speed_fluctuation,
            rpm_curve,
            time_curve,
            actual_safety_yield: safety_result.n_yield,
            actual_safety_fatigue: safety_result.n_fatigue,
            safety_passed: safety_result.safety_passed,
            safety_warnings: safety_result.warnings,
        })
    }
}

impl Default for SolverRegistry {
    fn default() -> Self {
        Self::new()
    }
}

/// Generate simplified rpm-time curve.
///
/// Simulates charge (acceleration) and discharge (deceleration) phases.
fn generate_rpm_curve(
    rpm_min: f64,
    rpm_max: f64,
    charge_time_s: f64,
    discharge_time_s: f64,
    n_points: usize,
) -> (Vec<f64>, Vec<f64>) {
    let total_t = charge_time_s + discharge_time_s;
    let dt = total_t / (n_points as f64 - 1.0);

    let mut time = Vec::with_capacity(n_points);
    let mut rpm = Vec::with_capacity(n_points);

    for i in 0..n_points {
        let t = i as f64 * dt;
        time.push(t);

        let speed = if t <= charge_time_s {
            // Linear acceleration
            rpm_min + (rpm_max - rpm_min) * (t / charge_time_s)
        } else {
            // Linear deceleration
            let t_discharge = t - charge_time_s;
            rpm_max - (rpm_max - rpm_min) * (t_discharge / discharge_time_s)
        };
        rpm.push(speed);
    }

    (time, rpm)
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_solver_registry_creation() {
        let registry = SolverRegistry::new();
        assert_eq!(registry.solvers.len(), 5);
    }

    #[test]
    fn test_get_solver_all_types() {
        let registry = SolverRegistry::new();

        let types = vec![
            FlywheelType::SolidDisk,
            FlywheelType::AnnularRing,
            FlywheelType::TaperedDisk,
            FlywheelType::ConstantStrength,
            FlywheelType::MultiLayerComposite,
        ];

        for ft in types {
            let solver = registry.get_solver(&ft);
            assert!(solver.is_ok(), "Failed to get solver for {:?}", ft);
        }
    }

    #[test]
    fn test_solver_names() {
        let registry = SolverRegistry::new();

        let solver = registry.get_solver(&FlywheelType::SolidDisk).unwrap();
        assert_eq!(solver.name(), "Solid Disk");
        assert_eq!(solver.name_zh(), "实心圆盘");

        let solver = registry.get_solver(&FlywheelType::AnnularRing).unwrap();
        assert_eq!(solver.name(), "Annular Ring");
        assert_eq!(solver.name_zh(), "环形轮（等厚度）");
    }

    #[test]
    fn test_solver_has_bore() {
        let registry = SolverRegistry::new();

        let solver = registry.get_solver(&FlywheelType::SolidDisk).unwrap();
        assert!(!solver.has_bore());

        let solver = registry.get_solver(&FlywheelType::AnnularRing).unwrap();
        assert!(solver.has_bore());
    }

    #[test]
    fn test_solve_validation() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams {
            r_o: -10.0, // Invalid
            ..Default::default()
        };
        let material = crate::types::materials::default_material();

        let result = registry.solve(&params, &material);
        assert!(result.is_err(), "Should fail with invalid params");
    }

    #[test]
    fn test_simulate_basic() {
        // Test complete simulation with default params
        let registry = SolverRegistry::new();
        let params = FlywheelParams::default();
        let material = crate::types::materials::aisi_4340_steel();

        let result = registry.simulate(&params, &material);
        assert!(result.is_ok(), "Simulate should succeed: {:?}", result.err());

        let sim = result.unwrap();

        // Verify basic properties
        assert!(sim.mass > 0.0, "Mass should be positive");
        assert!(sim.moment_of_inertia > 0.0, "Inertia should be positive");
        assert!(sim.max_stress_rated > 0.0, "Max stress should be positive");

        // Verify safety analysis
        assert!(sim.actual_safety_yield > 0.0, "Yield SF should be positive");
        assert!(sim.actual_safety_fatigue > 0.0, "Fatigue SF should be positive");
        assert!(sim.rpm_yield > 0.0, "Yield rpm should be positive");
        assert!(sim.rpm_burst > 0.0, "Burst rpm should be positive");

        // Verify energy analysis
        assert!(sim.energy_rated > 0.0, "Energy rated should be positive");
        assert!(sim.energy_max > sim.energy_rated, "Max energy should > rated");
        assert!(sim.energy_usable > 0.0, "Usable energy should be positive");
        assert!(sim.specific_energy > 0.0, "Specific energy should be positive");

        // Verify curves
        assert_eq!(sim.rpm_curve.len(), 100, "Should have 100 curve points");
        assert_eq!(sim.time_curve.len(), 100, "Should have 100 time points");
    }

    #[test]
    fn test_simulate_with_different_materials() {
        // Test simulation with all built-in materials
        let registry = SolverRegistry::new();
        let params = FlywheelParams::default();

        for material in crate::types::materials::all() {
            let result = registry.simulate(&params, &material);
            assert!(result.is_ok(),
                "Simulate should succeed for {}: {:?}",
                material.name, result.err());
        }
    }

    #[test]
    fn test_simulate_all_flywheel_types() {
        // Test simulation with all flywheel types
        let registry = SolverRegistry::new();
        let material = crate::types::materials::aisi_4340_steel();

        let types = vec![
            (FlywheelType::SolidDisk, true),
            (FlywheelType::AnnularRing, true),
            (FlywheelType::TaperedDisk, true),
            (FlywheelType::ConstantStrength, true),
            (FlywheelType::MultiLayerComposite, true),
        ];

        for (ft, has_bore) in types {
            let params = FlywheelParams {
                flywheel_type: ft,
                r_i: if has_bore { 40.0 } else { 0.0 },
                ..Default::default()
            };
            let result = registry.simulate(&params, &material);
            assert!(result.is_ok(),
                "Simulate should succeed for {:?}: {:?}",
                ft, result.err());
        }
    }
}
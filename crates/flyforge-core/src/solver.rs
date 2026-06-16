//! Flywheel Solver Architecture
//!
//! trait-based solver interface and factory registry.
//! This is the core architectural pattern for FlyForge - each flywheel type
//! implements the FlywheelSolver trait independently.
//!
//! Reference: 项目记忆文件 - 四、核心架构设计（关键经验）
//! Reference: CamForge architecture pattern

use crate::types::{
    FlywheelParams, FlywheelSection, FlywheelType, InertiaResult, Material, SolverOutput,
    StressDistribution,
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
        _params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        // TODO: Implement in step 5
        Err("SolidDiskSolver::compute_section not implemented".into())
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
    ) -> Result<InertiaResult, String> {
        // TODO: Implement in step 5
        // Reference: J = 0.5 * m * R^2
        Err("SolidDiskSolver::compute_inertia not implemented".into())
    }

    fn compute_stress(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
        _omega: f64,
    ) -> StressDistribution {
        // TODO: Implement in step 5
        StressDistribution {
            r: vec![],
            sigma_r: vec![],
            sigma_h: vec![],
            sigma_vm: vec![],
        }
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
        _params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Err("AnnularRingSolver::compute_section not implemented".into())
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
    ) -> Result<InertiaResult, String> {
        // TODO: Implement in step 5
        // Reference: J = 0.5 * m * (R1^2 + R2^2)
        Err("AnnularRingSolver::compute_inertia not implemented".into())
    }

    fn compute_stress(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
        _omega: f64,
    ) -> StressDistribution {
        StressDistribution {
            r: vec![],
            sigma_r: vec![],
            sigma_h: vec![],
            sigma_vm: vec![],
        }
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
        _params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Err("TaperedDiskSolver::compute_section not implemented".into())
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
    ) -> Result<InertiaResult, String> {
        Err("TaperedDiskSolver::compute_inertia not implemented".into())
    }

    fn compute_stress(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
        _omega: f64,
    ) -> StressDistribution {
        StressDistribution {
            r: vec![],
            sigma_r: vec![],
            sigma_h: vec![],
            sigma_vm: vec![],
        }
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
        _params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Err("ConstantStrengthSolver::compute_section not implemented".into())
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
    ) -> Result<InertiaResult, String> {
        Err("ConstantStrengthSolver::compute_inertia not implemented".into())
    }

    fn compute_stress(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
        _omega: f64,
    ) -> StressDistribution {
        StressDistribution {
            r: vec![],
            sigma_r: vec![],
            sigma_h: vec![],
            sigma_vm: vec![],
        }
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
        _params: &FlywheelParams,
        _material: &Material,
    ) -> Result<FlywheelSection, String> {
        Err("MultiLayerCompositeSolver::compute_section not implemented".into())
    }

    fn compute_inertia(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
    ) -> Result<InertiaResult, String> {
        // TODO: Implement in step 5
        // Reference: J_total = J_rim + J_web + J_hub
        Err("MultiLayerCompositeSolver::compute_inertia not implemented".into())
    }

    fn compute_stress(
        &self,
        _params: &FlywheelParams,
        _section: &FlywheelSection,
        _material: &Material,
        _omega: f64,
    ) -> StressDistribution {
        StressDistribution {
            r: vec![],
            sigma_r: vec![],
            sigma_h: vec![],
            sigma_vm: vec![],
        }
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
}

impl Default for SolverRegistry {
    fn default() -> Self {
        Self::new()
    }
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
}
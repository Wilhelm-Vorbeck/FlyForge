//! FlyForge Core Library
//!
//! Core computation library for flywheel design and simulation.
//! Zero framework dependencies - pure computation.
//!
//! Architecture: trait-based solver pattern (FlywheelSolver + SolverRegistry)
//! Reference: 项目记忆文件 - 四、核心架构设计

pub mod types;
pub mod solver;
pub mod geometry;
pub mod inertia;
pub mod stress;
pub mod safety;

// ============================================================
// Integration Tests
// ============================================================

#[cfg(test)]
mod tests {
    use crate::solver::SolverRegistry;
    use crate::types::{FlywheelParams, FlywheelType, materials};

    #[test]
    fn test_full_pipeline_annular_ring() {
        // Complete pipeline: params -> validate -> geometry -> inertia -> stress
        let registry = SolverRegistry::new();
        let params = FlywheelParams::default(); // AnnularRing, r_o=200, r_i=40, t=50
        let material = materials::aisi_4340_steel();

        let result = registry.solve(&params, &material);
        assert!(result.is_ok(), "Pipeline should succeed: {:?}", result.err());

        let output = result.unwrap();

        // Verify geometry
        assert!(output.geometry.volume > 0.0, "Volume should be positive");
        assert_eq!(output.geometry.r_points.len(), 100, "Should have 100 radial points");

        // Verify inertia (Reference: 机械知识库/公式计算/01-几何体计算.md)
        // For default params: mass ~49 kg, inertia ~1.0 kg·m²
        assert!(output.inertia.mass > 40.0 && output.inertia.mass < 55.0,
            "Mass {} should be in 40-55 kg range", output.inertia.mass);
        assert!(output.inertia.moment_of_inertia > 0.5 && output.inertia.moment_of_inertia < 1.5,
            "Inertia {} should be in 0.5-1.5 kg·m² range", output.inertia.moment_of_inertia);

        // Verify stress distribution
        assert!(!output.stress.sigma_vm.is_empty(), "Stress should not be empty");
        let max_vm = output.stress.sigma_vm.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        assert!(max_vm > 0.0, "Max von Mises stress should be positive");
    }

    #[test]
    fn test_full_pipeline_solid_disk() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams {
            r_i: 0.0,
            flywheel_type: FlywheelType::SolidDisk,
            ..Default::default()
        };
        let material = materials::aisi_4340_steel();

        let result = registry.solve(&params, &material);
        assert!(result.is_ok(), "Solid disk pipeline should succeed: {:?}", result.err());

        let output = result.unwrap();
        assert!(output.inertia.mass > 0.0);
        assert!(output.inertia.moment_of_inertia > 0.0);
    }

    #[test]
    fn test_full_pipeline_tapered_disk() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams {
            flywheel_type: FlywheelType::TaperedDisk,
            ..Default::default()
        };
        let material = materials::aisi_4340_steel();

        let result = registry.solve(&params, &material);
        assert!(result.is_ok(), "Tapered disk pipeline should succeed: {:?}", result.err());
    }

    #[test]
    fn test_full_pipeline_constant_strength() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams {
            flywheel_type: FlywheelType::ConstantStrength,
            ..Default::default()
        };
        let material = materials::aisi_4340_steel();

        let result = registry.solve(&params, &material);
        assert!(result.is_ok(), "Constant strength pipeline should succeed: {:?}", result.err());
    }

    #[test]
    fn test_full_pipeline_multi_layer() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams {
            flywheel_type: FlywheelType::MultiLayerComposite,
            ..Default::default()
        };
        let material = materials::aisi_4340_steel();

        let result = registry.solve(&params, &material);
        assert!(result.is_ok(), "Multi-layer pipeline should succeed: {:?}", result.err());
    }

    #[test]
    fn test_pipeline_with_different_materials() {
        let registry = SolverRegistry::new();
        let params = FlywheelParams::default();

        // Test with each built-in material
        for material in materials::all() {
            let result = registry.solve(&params, &material);
            assert!(result.is_ok(),
                "Pipeline should succeed for material {}: {:?}",
                material.name, result.err());
        }
    }

    #[test]
    fn test_pipeline_stress_proportional_to_speed_squared() {
        // Stress should scale with omega^2 (proportional to rpm^2)
        // Reference: 机械知识库/设计基础/03-常力学公式.md - 动荷应力
        let registry = SolverRegistry::new();
        let material = materials::aisi_4340_steel();

        let params_1000 = FlywheelParams {
            rpm_rated: 1000.0,
            rpm_max: 1500.0,
            rpm_min: 500.0,
            ..Default::default()
        };
        let params_2000 = FlywheelParams {
            rpm_rated: 2000.0,
            rpm_max: 3000.0,
            rpm_min: 1000.0,
            ..Default::default()
        };

        let out_1000 = registry.solve(&params_1000, &material).unwrap();
        let out_2000 = registry.solve(&params_2000, &material).unwrap();

        let max_1000 = out_1000.stress.sigma_vm.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let max_2000 = out_2000.stress.sigma_vm.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

        // Stress at 2000rpm should be ~4x stress at 1000rpm (omega^2)
        let ratio = max_2000 / max_1000;
        assert!(ratio > 3.5 && ratio < 4.5,
            "Stress ratio should be ~4.0 (omega^2), got {}", ratio);
    }

    #[test]
    fn test_pipeline_validation_rejects_invalid() {
        let registry = SolverRegistry::new();
        let material = materials::default_material();

        // Invalid: r_o < 0
        let params = FlywheelParams { r_o: -10.0, ..Default::default() };
        assert!(registry.solve(&params, &material).is_err());

        // Invalid: r_i > r_o
        let params = FlywheelParams { r_i: 300.0, ..Default::default() };
        assert!(registry.solve(&params, &material).is_err());

        // Invalid: rpm order
        let params = FlywheelParams {
            rpm_min: 5000.0,
            rpm_rated: 3000.0,
            rpm_max: 6000.0,
            ..Default::default()
        };
        assert!(registry.solve(&params, &material).is_err());
    }
}
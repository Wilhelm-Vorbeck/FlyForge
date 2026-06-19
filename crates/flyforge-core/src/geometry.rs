//! Flywheel Geometry Modeling
//!
//! Generate radial point sets and section geometry for different flywheel types.
//! All internal computations use SI units (meters).
//!
//! Reference: 机械知识库/公式计算/01-几何体计算.md

use crate::types::{FlywheelParams, FlywheelSection, FlywheelType, Material};
use std::f64::consts::PI;

/// Generate uniformly spaced radial points between r_i and r_o.
///
/// Input: r_i and r_o in mm.
/// Output: Vec<f64> of radial coordinates in meters.
pub fn generate_radial_points(r_i_mm: f64, r_o_mm: f64, n_points: usize) -> Vec<f64> {
    let r_i = r_i_mm / 1000.0;
    let r_o = r_o_mm / 1000.0;
    let n = n_points.max(2);
    let dr = (r_o - r_i) / (n as f64 - 1.0);

    (0..n).map(|i| r_i + dr * i as f64).collect()
}

/// Compute section geometry for a solid disk.
///
/// Solid disk: constant thickness t from 0 to r_o.
pub fn section_solid_disk(params: &FlywheelParams) -> FlywheelSection {
    let r_o = params.r_o;
    let t = params.thickness;
    let n = params.n_points.max(2);

    let r_points: Vec<f64> = (0..n)
        .map(|i| r_o * i as f64 / (n as f64 - 1.0))
        .collect();
    let t_points = vec![t; n];

    // Area = pi * r_o^2 (mm^2)
    let area = PI * r_o * r_o;
    // Volume = pi * r_o^2 * t (mm^3)
    let volume = area * t;

    FlywheelSection {
        r_points,
        t_points,
        area,
        volume,
    }
}

/// Compute section geometry for an annular ring (constant thickness).
///
/// Reference: 机械知识库/公式计算/01-几何体计算.md
/// Area = pi * (r_o^2 - r_i^2)
/// Volume = pi * (r_o^2 - r_i^2) * t
pub fn section_annular_ring(params: &FlywheelParams) -> FlywheelSection {
    let r_o = params.r_o;
    let r_i = params.r_i;
    let t = params.thickness;
    let n = params.n_points.max(2);

    let r_points: Vec<f64> = (0..n)
        .map(|i| r_i + (r_o - r_i) * i as f64 / (n as f64 - 1.0))
        .collect();
    let t_points = vec![t; n];

    let area = PI * (r_o * r_o - r_i * r_i);
    let volume = area * t;

    FlywheelSection {
        r_points,
        t_points,
        area,
        volume,
    }
}

/// Compute section geometry for a tapered disk.
///
/// Thickness varies linearly from t_max at center to t_min at rim.
/// t(r) = t_hub - (t_hub - t_rim) * (r - r_i) / (r_o - r_i)
pub fn section_tapered_disk(params: &FlywheelParams) -> FlywheelSection {
    let r_o = params.r_o;
    let r_i = params.r_i;
    let t_hub = params.hub_thickness;
    let t_rim = params.thickness;
    let n = params.n_points.max(2);

    let r_points: Vec<f64> = (0..n)
        .map(|i| r_i + (r_o - r_i) * i as f64 / (n as f64 - 1.0))
        .collect();

    let t_points: Vec<f64> = r_points
        .iter()
        .map(|&r| {
            if r_o > r_i {
                t_hub - (t_hub - t_rim) * (r - r_i) / (r_o - r_i)
            } else {
                t_rim
            }
        })
        .collect();

    // Volume via trapezoidal integration: V = 2*pi * integral(r * t(r), dr)
    let volume = numerical_volume(&r_points, &t_points);

    let area = PI * (r_o * r_o - r_i * r_i);

    FlywheelSection {
        r_points,
        t_points,
        area,
        volume,
    }
}

/// Compute section geometry for a constant-strength (hyperbolic profile) disk.
///
/// For constant stress, thickness varies as t(r) = t_center * exp(-rho*omega^2*r^2 / (2*sigma_allow)).
/// We approximate with a hyperbolic profile: t(r) = t_0 * (r_i / r)
pub fn section_constant_strength(params: &FlywheelParams) -> FlywheelSection {
    let r_o = params.r_o;
    let r_i = params.r_i;
    let t_center = params.thickness;
    let n = params.n_points.max(2);

    let r_points: Vec<f64> = (0..n)
        .map(|i| r_i + (r_o - r_i) * i as f64 / (n as f64 - 1.0))
        .collect();

    let t_points: Vec<f64> = r_points
        .iter()
        .map(|&r| {
            if r > 0.0 {
                t_center * r_i / r
            } else {
                t_center
            }
        })
        .collect();

    let volume = numerical_volume(&r_points, &t_points);
    let area = PI * (r_o * r_o - r_i * r_i);

    FlywheelSection {
        r_points,
        t_points,
        area,
        volume,
    }
}

/// Compute section geometry for a multi-layer composite flywheel.
///
/// When `params.layer_configs` is populated, layers are defined explicitly:
/// each layer has a material, thickness, and outer radius boundary.
/// When empty, falls back to legacy 3-layer hardcoded model (hub/web/rim).
pub fn section_multi_layer(params: &FlywheelParams) -> FlywheelSection {
    let r_o = params.r_o;
    let r_i = params.r_i;
    let n = params.n_points.max(2);

    let r_points: Vec<f64> = (0..n)
        .map(|i| r_i + (r_o - r_i) * i as f64 / (n as f64 - 1.0))
        .collect();

    let t_points: Vec<f64> = if params.layer_configs.is_empty() {
        // Legacy 3-layer fallback
        let r_hub = params.r_hub;
        let t_rim = params.thickness;
        let t_hub = params.hub_thickness;
        let t_web = t_rim * 0.4;
        r_points
            .iter()
            .map(|&r| {
                if r <= r_hub {
                    t_hub
                } else if r <= r_o * 0.85 {
                    let web_ratio = (r - r_hub) / (r_o * 0.85 - r_hub).max(1.0);
                    t_hub - (t_hub - t_web) * web_ratio
                } else {
                    t_rim
                }
            })
            .collect()
    } else {
        // Config-driven: each layer has outer_radius and thickness
        r_points
            .iter()
            .map(|&r| {
                for layer in &params.layer_configs {
                    if r <= layer.outer_radius {
                        return layer.thickness;
                    }
                }
                // Beyond last layer → use last layer thickness
                params.layer_configs.last().map(|l| l.thickness).unwrap_or(params.thickness)
            })
            .collect()
    };

    let volume = numerical_volume(&r_points, &t_points);
    let area = PI * (r_o * r_o - r_i * r_i);

    FlywheelSection {
        r_points,
        t_points,
        area,
        volume,
    }
}

/// Numerical volume integration using trapezoidal rule.
/// V = 2*pi * integral(r * t(r), dr) from r_i to r_o
///
/// All inputs in mm, output in mm^3.
fn numerical_volume(r_points: &[f64], t_points: &[f64]) -> f64 {
    let mut volume = 0.0;
    for i in 0..r_points.len() - 1 {
        let dr = r_points[i + 1] - r_points[i];
        let r_t_left = r_points[i] * t_points[i];
        let r_t_right = r_points[i + 1] * t_points[i + 1];
        volume += (r_t_left + r_t_right) * dr * 0.5;
    }
    volume * 2.0 * PI
}

/// Dispatch section computation based on flywheel type.
pub fn compute_section(
    params: &FlywheelParams,
    _material: &Material,
) -> Result<FlywheelSection, String> {
    match params.flywheel_type {
        FlywheelType::SolidDisk => Ok(section_solid_disk(params)),
        FlywheelType::AnnularRing => Ok(section_annular_ring(params)),
        FlywheelType::TaperedDisk => Ok(section_tapered_disk(params)),
        FlywheelType::ConstantStrength => Ok(section_constant_strength(params)),
        FlywheelType::MultiLayerComposite => Ok(section_multi_layer(params)),
    }
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    fn default_params() -> FlywheelParams {
        FlywheelParams::default()
    }

    #[test]
    fn test_radial_points_count() {
        let pts = generate_radial_points(40.0, 200.0, 100);
        assert_eq!(pts.len(), 100);
    }

    #[test]
    fn test_radial_points_range() {
        let pts = generate_radial_points(40.0, 200.0, 100);
        let r_i = 40.0 / 1000.0;
        let r_o = 200.0 / 1000.0;
        assert!((pts[0] - r_i).abs() < 1e-10);
        assert!((pts[99] - r_o).abs() < 1e-10);
    }

    #[test]
    fn test_section_annular_ring_volume() {
        // Reference: 机械知识库/公式计算/01-几何体计算.md
        // V = pi * (r_o^2 - r_i^2) * t
        let params = default_params(); // r_o=200, r_i=40, t=50
        let section = section_annular_ring(&params);
        let expected = PI * (200.0_f64.powi(2) - 40.0_f64.powi(2)) * 50.0;
        assert!(
            (section.volume - expected).abs() < 1.0,
            "Volume mismatch: got {}, expected {}",
            section.volume,
            expected
        );
    }

    #[test]
    fn test_section_solid_disk_volume() {
        let params = FlywheelParams {
            r_i: 0.0,
            flywheel_type: FlywheelType::SolidDisk,
            ..default_params()
        };
        let section = section_solid_disk(&params);
        let expected = PI * 200.0_f64.powi(2) * 50.0;
        assert!(
            (section.volume - expected).abs() < 1.0,
            "Volume mismatch: got {}, expected {}",
            section.volume,
            expected
        );
    }

    #[test]
    fn test_compute_section_dispatch() {
        let mat = materials::default_material();

        let params = FlywheelParams {
            flywheel_type: FlywheelType::SolidDisk,
            r_i: 0.0,
            ..default_params()
        };
        assert!(compute_section(&params, &mat).is_ok());

        let params = FlywheelParams {
            flywheel_type: FlywheelType::AnnularRing,
            ..default_params()
        };
        assert!(compute_section(&params, &mat).is_ok());
    }
}
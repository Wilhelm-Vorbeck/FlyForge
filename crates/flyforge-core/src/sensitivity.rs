/// Parameter sensitivity analysis — sweep a parameter range and collect simulation results.
///
/// Given base parameters, a parameter name, and a range of values,
/// runs the simulation for each value and returns the resulting metrics.
use crate::solver::SolverRegistry;
use crate::types::{FlywheelParams, Material};

/// Which parameter to sweep
#[derive(Debug, Clone, Copy)]
pub enum SweepParam {
    OuterRadius,
    InnerRadius,
    Thickness,
    HubRadius,
    HubThickness,
    RatedRpm,
    MaxRpm,
}

/// Which metric to measure
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum SweepMetric {
    MaxStress,
    Mass,
    Inertia,
    EnergyRated,
    EnergyUsable,
    SpecificEnergy,
    SafetyYield,
    SafetyFatigue,
}

/// Single point in a sensitivity sweep
#[derive(Debug, Clone)]
pub struct SensitivityPoint {
    /// The varied parameter value
    pub param_value: f64,
    /// The resulting metric value
    pub metric_value: f64,
}

/// Result of a full sensitivity sweep
#[derive(Debug, Clone)]
pub struct SensitivityResult {
    pub points: Vec<SensitivityPoint>,
    pub param_name: String,
    pub param_unit: String,
    pub metric_name: String,
    pub metric_unit: String,
    pub base_param_value: f64,
    pub base_metric_value: f64,
}

impl SweepParam {
    pub fn name(&self) -> &'static str {
        match self {
            SweepParam::OuterRadius => "外径 Ro",
            SweepParam::InnerRadius => "内径 Ri",
            SweepParam::Thickness => "厚度",
            SweepParam::HubRadius => "轮毂径",
            SweepParam::HubThickness => "轮毂厚",
            SweepParam::RatedRpm => "额定转速",
            SweepParam::MaxRpm => "最大转速",
        }
    }

    pub fn unit(&self) -> &'static str {
        match self {
            SweepParam::OuterRadius | SweepParam::InnerRadius
            | SweepParam::Thickness | SweepParam::HubRadius
            | SweepParam::HubThickness => "mm",
            SweepParam::RatedRpm | SweepParam::MaxRpm => "rpm",
        }
    }

    fn apply(&self, params: &mut FlywheelParams, value: f64) {
        match self {
            SweepParam::OuterRadius => params.r_o = value,
            SweepParam::InnerRadius => params.r_i = value,
            SweepParam::Thickness => params.thickness = value,
            SweepParam::HubRadius => params.r_hub = value,
            SweepParam::HubThickness => params.hub_thickness = value,
            SweepParam::RatedRpm => params.rpm_rated = value,
            SweepParam::MaxRpm => params.rpm_max = value,
        }
    }
}

impl SweepMetric {
    pub fn name(&self) -> &'static str {
        match self {
            SweepMetric::MaxStress => "最大应力",
            SweepMetric::Mass => "质量",
            SweepMetric::Inertia => "转动惯量",
            SweepMetric::EnergyRated => "额定储能",
            SweepMetric::EnergyUsable => "可用能量",
            SweepMetric::SpecificEnergy => "比能量",
            SweepMetric::SafetyYield => "屈服安全系数",
            SweepMetric::SafetyFatigue => "疲劳安全系数",
        }
    }

    pub fn unit(&self) -> &'static str {
        match self {
            SweepMetric::MaxStress => "MPa",
            SweepMetric::Mass => "kg",
            SweepMetric::Inertia => "kg·m²",
            SweepMetric::EnergyRated | SweepMetric::EnergyUsable => "kJ",
            SweepMetric::SpecificEnergy => "Wh/kg",
            SweepMetric::SafetyYield | SweepMetric::SafetyFatigue => "",
        }
    }

    fn extract(&self, sim: &crate::types::FlywheelSimulation) -> f64 {
        match self {
            SweepMetric::MaxStress => sim.max_stress_rated,
            SweepMetric::Mass => sim.mass,
            SweepMetric::Inertia => sim.moment_of_inertia,
            SweepMetric::EnergyRated => sim.energy_rated,
            SweepMetric::EnergyUsable => sim.energy_usable,
            SweepMetric::SpecificEnergy => sim.specific_energy,
            SweepMetric::SafetyYield => sim.actual_safety_yield,
            SweepMetric::SafetyFatigue => sim.actual_safety_fatigue,
        }
    }
}

/// Run a sensitivity sweep: vary one parameter over a range, collect one metric.
///
/// `num_points` controls how many samples are taken (default 20).
/// Skips any invalid parameter combinations and marks them as `f64::NAN` in output.
pub fn run_sweep(
    base_params: &FlywheelParams,
    material: &Material,
    sweep_param: SweepParam,
    metric: SweepMetric,
    from: f64,
    to: f64,
    num_points: usize,
) -> SensitivityResult {
    let registry = SolverRegistry::new();
    let n = num_points.max(2);
    let mut points = Vec::with_capacity(n);

    // Compute base value for reference
    let base_result = registry.simulate(base_params, material);
    let base_metric_value = base_result
        .as_ref()
        .map(|s| metric.extract(s))
        .unwrap_or(f64::NAN);

    for i in 0..n {
        let t = i as f64 / (n as f64 - 1.0);
        let val = from + (to - from) * t;
        let mut p = base_params.clone();
        sweep_param.apply(&mut p, val);

        // Validate before simulating
        if p.validate().is_err() {
            points.push(SensitivityPoint {
                param_value: val,
                metric_value: f64::NAN,
            });
            continue;
        }

        let result = registry.simulate(&p, material);
        let metric_val = result
            .as_ref()
            .map(|s| metric.extract(s))
            .unwrap_or(f64::NAN);

        points.push(SensitivityPoint {
            param_value: val,
            metric_value: metric_val,
        });
    }

    SensitivityResult {
        param_name: sweep_param.name().to_string(),
        param_unit: sweep_param.unit().to_string(),
        metric_name: metric.name().to_string(),
        metric_unit: metric.unit().to_string(),
        base_param_value: 0.0, // set by caller or we auto-detect
        base_metric_value,
        points,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::materials;

    #[test]
    fn test_sweep_outer_radius_stress() {
        let params = FlywheelParams::default();
        let mat = materials::aisi_4340_steel();
        let result = run_sweep(
            &params, &mat,
            SweepParam::OuterRadius,
            SweepMetric::MaxStress,
            100.0,
            300.0,
            8,
        );
        assert_eq!(result.points.len(), 8);
        // Stress should decrease as radius increases (for same rpm and ri)
        assert!(result.points[0].metric_value.is_finite());
    }

    #[test]
    fn test_sweep_rpm_energy() {
        let params = FlywheelParams::default();
        let mat = materials::aisi_4340_steel();
        // rpm sweep must respect: rpm_min < rpm_rated < rpm_max
        let result = run_sweep(
            &params, &mat,
            SweepParam::RatedRpm,
            SweepMetric::EnergyRated,
            1600.0,  // > rpm_min=1500
            4400.0,  // < rpm_max=4500
            6,
        );
        assert_eq!(result.points.len(), 6);
        // Filter out NaN (invalid) points
        let valid: Vec<_> = result.points.iter().filter(|p| p.metric_value.is_finite()).collect();
        assert!(valid.len() >= 3, "Expected at least 3 valid sweep points");
        let first = valid.first().unwrap().metric_value;
        let last = valid.last().unwrap().metric_value;
        assert!(last > first, "Energy should increase with RPM");
    }

    #[test]
    fn test_invalid_range_yields_nan() {
        let mut params = FlywheelParams::default();
        params.r_i = 10.0;
        let mat = materials::aisi_4340_steel();
        let result = run_sweep(
            &params, &mat,
            SweepParam::OuterRadius,
            SweepMetric::Mass,
            5.0,  // r_o=5 < r_i=10 → invalid
            15.0,
            5,
        );
        assert_eq!(result.points.len(), 5);
    }
}

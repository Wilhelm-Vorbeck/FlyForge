//! Flywheel Dynamics Simulation
//!
//! Implements ODE solver for flywheel acceleration/deceleration.
//! Uses RK4 (Runge-Kutta 4th order) method for numerical integration.
//!
//! Reference: 项目记忆文件 - 七、核心公式全集 (7.5 动力学)
//! Reference: 机械知识库/设计基础/03-常力学公式.md

/// Torque function type.
///
/// Input: time (s), angular velocity (rad/s)
/// Output: net torque (N·m)
pub type TorqueFn = dyn Fn(f64, f64) -> f64;

/// Simulation time and angular velocity points.
#[derive(Debug, Clone)]
pub struct DynamicsResult {
    /// Time points (s)
    pub time: Vec<f64>,
    /// Angular velocity points (rad/s)
    pub omega: Vec<f64>,
    /// Speed points (rpm)
    pub rpm: Vec<f64>,
    /// Final time (s)
    pub final_time: f64,
    /// Final angular velocity (rad/s)
    pub final_omega: f64,
    /// Final speed (rpm)
    pub final_rpm: f64,
}

/// Compute angular acceleration from net torque.
///
/// Formula: dω/dt = T_net / J
///
/// Input: T_net (N·m), J (kg·m²)
/// Output: angular acceleration (rad/s²)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.5)
pub fn angular_acceleration(net_torque: f64, inertia: f64) -> f64 {
    if inertia <= 0.0 {
        return 0.0;
    }
    net_torque / inertia
}

/// Run RK4 ODE solver.
///
/// Solves: dω/dt = f(t, ω) where f is the torque function
///
/// Formula: ω_{n+1} = ω_n + (k1 + 2k2 + 2k3 + k4)/6
/// where:
///   k1 = h · f(t_n, ω_n)
///   k2 = h · f(t_n + h/2, ω_n + k1/2)
///   k3 = h · f(t_n + h/2, ω_n + k2/2)
///   k4 = h · f(t_n + h, ω_n + k3)
///
/// Reference: 项目记忆文件 - 七、核心公式全集 (7.5)
pub fn rk4_step(
    f: &TorqueFn,
    t: f64,
    omega: f64,
    h: f64,
) -> f64 {
    let k1 = h * f(t, omega);
    let k2 = h * f(t + h / 2.0, omega + k1 / 2.0);
    let k3 = h * f(t + h / 2.0, omega + k2 / 2.0);
    let k4 = h * f(t + h, omega + k3);

    omega + (k1 + 2.0 * k2 + 2.0 * k3 + k4) / 6.0
}

/// Run dynamics simulation.
///
/// Simulates flywheel acceleration/deceleration using RK4 method.
///
/// Input:
/// - inertia: moment of inertia (kg·m²) - used by torque function
/// - torque_fn: net torque function f(t, omega) -> T_net (N·m)
/// - initial_omega: initial angular velocity (rad/s)
/// - h: time step (s)
/// - max_steps: maximum number of steps
/// - max_time: maximum simulation time (s)
///
/// Output: DynamicsResult
pub fn simulate_dynamics(
    _inertia: f64,
    torque_fn: &TorqueFn,
    initial_omega: f64,
    h: f64,
    max_steps: usize,
    max_time: f64,
) -> DynamicsResult {
    let mut time = Vec::with_capacity(max_steps + 1);
    let mut omega = Vec::with_capacity(max_steps + 1);
    let mut rpm = Vec::with_capacity(max_steps + 1);

    let mut t = 0.0;
    let mut w = initial_omega;
    let pi = std::f64::consts::PI;

    time.push(t);
    omega.push(w);
    rpm.push(w * 30.0 / pi);

    for _ in 0..max_steps {
        if t >= max_time {
            break;
        }

        let actual_h = if t + h > max_time { max_time - t } else { h };
        w = rk4_step(torque_fn, t, w, actual_h);
        t += actual_h;

        time.push(t);
        omega.push(w);
        rpm.push(w * 30.0 / pi);
    }

    let final_time = *time.last().unwrap_or(&0.0);
    let final_omega = *omega.last().unwrap_or(&initial_omega);
    let final_rpm = *rpm.last().unwrap_or(&(initial_omega * 30.0 / pi));

    DynamicsResult {
        time,
        omega,
        rpm,
        final_time,
        final_omega,
        final_rpm,
    }
}

/// Create constant torque function.
///
/// Returns a torque function that produces constant net torque.
pub fn constant_torque(torque: f64) -> Box<TorqueFn> {
    Box::new(move |_t: f64, _omega: f64| torque)
}

/// Create linear torque function.
///
/// Returns a torque function that produces torque proportional to time.
/// T(t) = torque_0 + torque_rate * t
pub fn linear_torque(torque_0: f64, torque_rate: f64) -> Box<TorqueFn> {
    Box::new(move |t: f64, _omega: f64| torque_0 + torque_rate * t)
}

/// Create speed-dependent friction torque function.
///
/// Returns a torque function with viscous friction.
/// T_friction = -friction_coeff * omega
pub fn viscous_friction_torque(friction_coeff: f64) -> Box<TorqueFn> {
    Box::new(move |_t: f64, omega: f64| -friction_coeff * omega)
}

/// Create combined torque function.
///
/// Combines multiple torque functions by summing them.
pub fn combined_torque(torques: Vec<Box<TorqueFn>>) -> Box<TorqueFn> {
    Box::new(move |t: f64, omega: f64| {
        torques.iter().map(|f| f(t, omega)).sum()
    })
}

// ============================================================
// Unit Tests
// ============================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_angular_acceleration_basic() {
        // α = T / J
        // For T=10 N·m, J=2 kg·m²: α = 5 rad/s²
        let alpha = angular_acceleration(10.0, 2.0);
        assert!((alpha - 5.0).abs() < 1e-10, "Alpha: got {}, expected 5.0", alpha);
    }

    #[test]
    fn test_angular_acceleration_zero_inertia() {
        let alpha = angular_acceleration(10.0, 0.0);
        assert_eq!(alpha, 0.0, "Should be 0 for zero inertia");
    }

    #[test]
    fn test_rk4_constant_torque() {
        // With constant torque T=10 N·m and J=1 kg·m²:
        // α = 10 rad/s²
        // ω(t) = ω_0 + 10*t
        let torque_fn = constant_torque(10.0);
        let omega_0 = 0.0;
        let h = 0.1;

        let omega_1 = rk4_step(&torque_fn, 0.0, omega_0, h);
        let expected = omega_0 + 10.0 * h; // Linear acceleration
        assert!((omega_1 - expected).abs() < 0.01,
            "RK4 step: got {}, expected {}", omega_1, expected);
    }

    #[test]
    fn test_simulate_dynamics_constant_torque() {
        // Simulate constant torque for 1 second
        let torque_fn = constant_torque(10.0);
        let result = simulate_dynamics(1.0, &torque_fn, 0.0, 0.01, 1000, 1.0);

        // Should reach ω ≈ 10 rad/s after 1 second
        assert!((result.final_omega - 10.0).abs() < 0.1,
            "Final omega: got {}, expected ~10.0", result.final_omega);
        assert!((result.final_time - 1.0).abs() < 0.01,
            "Final time: got {}, expected 1.0", result.final_time);
    }

    #[test]
    fn test_simulate_dynamics_viscous_friction() {
        // With viscous friction, omega should approach equilibrium
        let torque_fn = viscous_friction_torque(1.0);
        let result = simulate_dynamics(1.0, &torque_fn, 10.0, 0.1, 1000, 10.0);

        // With friction coefficient 1.0, omega should decay to ~0
        assert!(result.final_omega < 1.0,
            "Final omega with friction: got {}, should be small", result.final_omega);
    }

    #[test]
    fn test_rpm_conversion() {
        // Verify rpm = omega * 30 / π
        let torque_fn = constant_torque(0.0);
        let result = simulate_dynamics(1.0, &torque_fn, 10.0, 0.1, 10, 1.0);

        let expected_rpm = 10.0 * 30.0 / std::f64::consts::PI;
        assert!((result.rpm[0] - expected_rpm).abs() < 1e-10,
            "RPM conversion: got {}, expected {}", result.rpm[0], expected_rpm);
    }

    #[test]
    fn test_simulate_dynamics_max_steps() {
        // Should stop at max_steps
        let torque_fn = constant_torque(1.0);
        let result = simulate_dynamics(1.0, &torque_fn, 0.0, 0.01, 50, 100.0);

        // Should have ~51 points (initial + 50 steps)
        assert!(result.time.len() <= 51, "Should stop at max_steps");
    }

    #[test]
    fn test_simulate_dynamics_max_time() {
        // Should stop at max_time
        let torque_fn = constant_torque(1.0);
        let result = simulate_dynamics(1.0, &torque_fn, 0.0, 0.01, 10000, 0.5);

        // Should stop at t ≈ 0.5s
        assert!((result.final_time - 0.5).abs() < 0.01,
            "Final time: got {}, expected 0.5", result.final_time);
    }
}
/**
 * Parameter validation utilities for FlyForge.
 * Provides cross-field boundary checks with user-friendly messages.
 */
import { FlywheelParams, FlywheelType } from "../types";

export interface ValidationIssue {
  field: keyof FlywheelParams;
  level: "error" | "warning";
  message: string;
}

/**
 * Validate flywheel parameters for consistency and safety.
 * Returns an array of issues sorted by severity (errors first).
 */
export function validateParams(params: FlywheelParams): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Outer radius
  if (params.r_o <= 0) {
    issues.push({ field: "r_o", level: "error", message: "外径必须大于 0" });
  }

  // Inner radius vs outer radius
  if (params.flywheel_type !== FlywheelType.SolidDisk) {
    if (params.r_i < 0) {
      issues.push({ field: "r_i", level: "error", message: "内径不能为负数" });
    }
    if (params.r_i >= params.r_o) {
      issues.push({ field: "r_i", level: "error", message: `内径 ${params.r_i} 必须小于外径 ${params.r_o}` });
    }
    // Suggested range
    const riRatio = params.r_o > 0 ? params.r_i / params.r_o : 0;
    if (riRatio > 0.5 && params.r_i < params.r_o) {
      issues.push({ field: "r_i", level: "warning", message: `内径偏大（外径的 ${(riRatio * 100).toFixed(0)}%），建议 ≤ 外径的 50%` });
    }
    if (riRatio < 0.1 && params.r_i > 0) {
      issues.push({ field: "r_i", level: "warning", message: `内径偏小（外径的 ${(riRatio * 100).toFixed(0)}%），建议 ≥ 外径的 10%` });
    }
  }

  // Thickness
  if (params.thickness <= 0) {
    issues.push({ field: "thickness", level: "error", message: "厚度必须大于 0" });
  }
  if (params.thickness > params.r_o * 2) {
    issues.push({ field: "thickness", level: "warning", message: "厚度超过外径 2 倍，结构不合理" });
  }

  // Hub radius vs outer radius
  if (params.r_hub <= 0) {
    issues.push({ field: "r_hub", level: "error", message: "轮毂径必须大于 0" });
  }
  if (params.r_hub >= params.r_o) {
    issues.push({ field: "r_hub", level: "error", message: `轮毂径 ${params.r_hub} 必须小于外径 ${params.r_o}` });
  }
  if (params.flywheel_type !== FlywheelType.SolidDisk && params.r_hub <= params.r_i) {
    issues.push({ field: "r_hub", level: "warning", message: "轮毂径应大于内径" });
  }

  // Hub thickness
  if (params.hub_thickness <= 0) {
    issues.push({ field: "hub_thickness", level: "error", message: "轮毂厚度必须大于 0" });
  }

  // Speeds
  if (params.rpm_rated <= 0) {
    issues.push({ field: "rpm_rated", level: "error", message: "额定转速必须大于 0" });
  }
  if (params.rpm_max <= params.rpm_rated) {
    issues.push({ field: "rpm_max", level: "error", message: `最大转速 ${params.rpm_max} 必须大于额定转速 ${params.rpm_rated}` });
  }
  if (params.rpm_min < 0) {
    issues.push({ field: "rpm_min", level: "error", message: "最小转速不能为负数" });
  }
  if (params.rpm_min >= params.rpm_rated) {
    issues.push({ field: "rpm_min", level: "warning", message: "最小转速应小于额定转速" });
  }
  if (params.rpm_max > 100000) {
    issues.push({ field: "rpm_max", level: "warning", message: "最大转速超过 100,000 rpm，请确认合理性" });
  }

  // N points
  if (params.n_points < 10) {
    issues.push({ field: "n_points", level: "warning", message: "离散点数太少（< 10），计算精度可能不足" });
  }

  // Safety factors
  if (params.safety_factor_yield < 1.0) {
    issues.push({ field: "safety_factor_yield", level: "warning", message: "屈服安全系数 < 1.0，设计存在风险" });
  }
  if (params.safety_factor_fatigue < 1.0) {
    issues.push({ field: "safety_factor_fatigue", level: "warning", message: "疲劳安全系数 < 1.0，设计存在风险" });
  }
  if (params.safety_factor_burst < 1.5) {
    issues.push({ field: "safety_factor_burst", level: "warning", message: "破裂安全系数 < 1.5，建议 ≥ 2.0" });
  }

  return issues.sort((a, b) => (a.level === "error" ? 0 : 1) - (b.level === "error" ? 0 : 1));
}

/**
 * Get validation issue for a specific field (if any).
 */
export function getFieldIssue(params: FlywheelParams, field: keyof FlywheelParams): ValidationIssue | undefined {
  return validateParams(params).find((i) => i.field === field);
}

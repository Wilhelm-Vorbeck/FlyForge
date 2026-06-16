export const zh = {
  // App
  appName: "FlyForge",
  appSubtitle: "飞轮设计及运动学模拟",
  
  // Header
  toggleSidebar: "切换侧边栏",
  calculating: "计算中...",
  resetParams: "重置参数",
  
  // Sidebar tabs
  geometryTab: "几何参数",
  materialTab: "材料选择",
  operatingTab: "工况参数",
  
  // Geometry
  outerRadius: "外径 (R_o)",
  innerRadius: "内径 (R_i)",
  rimThickness: "轮缘厚度",
  hubOuterRadius: "轮毂外径",
  hubThickness: "轮毂厚度",
  sectionPreview: "截面预览",
  
  // Material
  presetMaterial: "预设材料",
  materialProperties: "材料属性",
  density: "密度",
  yieldStrength: "屈服强度",
  specificStrength: "比强度",
  applicability: "适用性",
  highPerformance: "高性能",
  standard: "标准",
  materialComparison: "材料性能对比",
  
  // Operating
  speedSettings: "转速设置",
  ratedSpeed: "额定转速",
  maxSpeed: "最大转速",
  minSpeed: "最小转速",
  safetyFactors: "安全系数",
  yieldSafetyFactor: "屈服安全系数",
  fatigueSafetyFactor: "疲劳安全系数",
  burstSafetyFactor: "破裂安全系数",
  calculationSettings: "计算设置",
  radialPoints: "径向离散点数",
  speedRange: "转速范围",
  
  // Flywheel types
  flywheelType: "飞轮类型",
  solidDisk: "实心圆盘",
  annularRing: "环形轮（等厚度）",
  taperedDisk: "锥形盘",
  constantStrength: "等强度轮",
  multiLayerComposite: "多层复合轮",
  
  // Auto-run
  autoRun: "参数变化时自动计算",
  
  // Main content
  results: "计算结果",
  visualization: "可视化",
  runSimulation: "运行仿真",
  configureAndRun: "配置参数并运行仿真",
  resultsWillAppear: "结果将显示在此处",
  runToVisualize: "运行仿真以查看可视化",
  chartsWillAppear: "图表将显示在此处",
  
  // Results
  flywheelMass: "飞轮质量",
  momentOfInertia: "转动惯量",
  maxVonMises: "最大等效应力",
  stressLocation: "应力位置",
  yieldSafety: "屈服安全系数",
  fatigueSafety: "疲劳安全系数",
  burstSpeed: "破裂转速",
  ratedEnergy: "额定储能",
  usableEnergy: "可用能量",
  specificEnergy: "比能量",
  safetyWarnings: "安全警告",
  safetyPassed: "安全评估通过",
  safetyFailed: "安全评估未通过",
  
  // Visualization
  stressDistribution: "径向应力分布",
  rpmCurve: "转速-时间曲线",
  energyDistribution: "能量特性",
  flywheelSection: "飞轮截面",
  vonMises: "von Mises",
  hoopStress: "周向应力",
  radialStress: "径向应力",
  rated: "额定",
  maximum: "最大",
  usable: "可用",
  
  // Units
  unitMm: "mm",
  unitKg: "kg",
  unitKgM2: "kg·m²",
  unitMpa: "MPa",
  unitKj: "kJ",
  unitWhKg: "Wh/kg",
  unitRpm: "rpm",
  unitPoints: "点",
  unitKgM3: "kg/m³",
  unitMpam3kg: "MPa·m³/kg",
  
  // Errors
  errorOccurred: "发生错误",
  calculationError: "计算错误",
  invalidParams: "参数无效",
};

export type Translations = typeof zh;

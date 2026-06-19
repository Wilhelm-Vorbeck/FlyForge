<p align="center">
  <img src="src-tauri/icons/128x128.png" alt="FlyForge Logo" width="128" height="128" />
</p>

<h1 align="center">FlyForge</h1>

<p align="center">
  <strong>飞轮设计与运动学仿真桌面应用</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-v0.2.0-4ADE80?style=flat-square&labelColor=0a0f14" alt="Version" />
  <img src="https://img.shields.io/badge/platform-Windows%20x64-4ADE80?style=flat-square&labelColor=0a0f14" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-4ADE80?style=flat-square&labelColor=0a0f14" alt="License" />
  <img src="https://img.shields.io/badge/tauri-v2-4ADE80?style=flat-square&labelColor=0a0f14" alt="Tauri" />
  <img src="https://img.shields.io/badge/solidjs-v1.9-4ADE80?style=flat-square&labelColor=0a0f14" alt="SolidJS" />
</p>

---

## 致谢与灵感来源

> **本项目的灵感来源与对标项目：[CamForge](https://github.com/EkaEva/CamForge)**
>
> CamForge 是一款基于 Tauri v2 的凸轮设计桌面应用，提供了参数输入、凸轮轮廓预览、运动分析曲线等完整的工程设计功能。
>
> FlyForge 的整体架构设计、UI 布局模式、交互方式（截面预览 + 图表分析 + 结果面板）均以 CamForge 为参照蓝本进行开发。
> 在此基础上，FlyForge 将应用场景从凸轮设计拓展到飞轮设计与运动学仿真领域，实现了飞轮参数建模、应力分析、动力学仿真等专属功能。
>
> 感谢 CamForge 项目提供的设计思路和技术参考。

---

## 简介

FlyForge 是一款专为机械工程领域打造的飞轮设计与仿真桌面应用。基于 **Tauri v2 + SolidJS + Rust** 构建，提供高性能的飞轮参数设计、应力分析、动力学仿真与数据可视化功能。

## 功能特性

### 飞轮参数设计
- **5 种飞轮类型**：实心圆盘、环形轮（等厚度）、锥形盘、等强度轮、多层复合轮
- **几何尺寸**：外径 Ro、内径 Ri、轮缘厚度、轮毂径、轮毂厚度
- **材料库**：12 种预设材料 + 自定义材料（合金钢、铝合金、钛合金、碳纤维、铸铁等）
- **工况参数**：额定/最大/最小转速、安全系数、离散点数量
- **预设方案**：8 种典型飞轮配置一键加载
- **参数导入/导出**：JSON 格式导入导出参数，跨会话复用

### 飞轮截面预览
- SVG 实时渲染飞轮截面轮廓
- 滚轮缩放 + 鼠标拖拽平移
- 网格背景 + 坐标轴 + 颜色图例

### 可视化图表
- **应力分布图**：等效应力、周向应力、径向应力随半径变化曲线
- **屈服强度参考线**：应力图中标注材料屈服强度，超出范围时顶部提示
- **转速曲线**：启动/制动过程转速-时间曲线（含额定/最大转速参考线）
- **能量柱状图**：额定/最大/可用储能对比
- 十字准星跟踪 + 实时数据浮动框
- 滚轮缩放 + 拖拽平移 + 极值点标注

### 计算结果
- 质量、转动惯量、最大应力及位置
- 屈服/疲劳安全系数、安全破裂转速
- 额定/可用/最大储能、比能量
- 安全评估状态（通过/未通过）

### 数据导出
- CSV / JSON / SVG / 参数 JSON 多种格式导出
- 支持自定义保存路径

## 界面特性

- 黑绿科技配色主题
- 左右侧边栏可折叠
- 中央区分隔线可拖拽调整上下比例
- 数字输入框长按快速微调
- 实时计算（300ms 防抖）
- **布局记忆**：侧边栏状态、布局比例、飞轮类型和材料重启后恢复

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | [SolidJS](https://www.solidjs.com/) + TypeScript |
| UI 样式 | [Tailwind CSS](https://tailwindcss.com/) |
| 构建工具 | [Vite](https://vitejs.dev/) |
| 桌面框架 | [Tauri v2](https://v2.tauri.app/) (Rust) |
| 计算核心 | Rust (flyforge-core) |
| 安装包 | NSIS |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) >= 1.70
- Windows 10/11 (x64)

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev          # 启动前端开发服务器
npx tauri dev        # 启动 Tauri 开发模式（含前端 + Rust 后端）
```

### 构建安装包

```bash
npx tauri build      # 构建 Windows 安装包 (.exe)
```

构建产物位于 `src-tauri/target/release/bundle/nsis/`。

### 运行测试

```bash
cargo test --workspace    # Rust 单元测试
```

## 项目结构

```
FlyForge/
├── src/                          # 前端源码 (SolidJS + TypeScript)
│   ├── components/               # UI 组件
│   │   ├── Layout.tsx            # 主布局（三栏 + 分隔线）
│   │   ├── Header.tsx            # 顶栏（标题 + 状态）
│   │   ├── AccordionPanel.tsx    # 左侧参数面板
│   │   ├── SectionPreview.tsx    # 飞轮截面预览
│   │   ├── VisualizationPanel.tsx# 可视化图表
│   │   └── ResultsPanel.tsx      # 右侧结果面板
│   ├── services/                 # API 调用层
│   ├── store/                    # 全局状态管理
│   └── types/                    # TypeScript 类型定义
├── crates/                       # Rust 代码
│   ├── flyforge-core/            # 飞轮计算核心库
│   └── flyforge-server/          # 可选 REST API 服务
├── src-tauri/                    # Tauri 桌面应用入口
│   ├── src/lib.rs                # Tauri 命令定义
│   ├── icons/                    # 应用图标
│   └── tauri.conf.json           # Tauri 配置
└── .github/workflows/            # CI/CD
```

## 许可证

[MIT License](LICENSE)

## 相关项目

| 项目 | 说明 |
|------|------|
| [CamForge](https://github.com/EkaEva/CamForge) | 凸轮设计桌面应用（本项目灵感来源） |

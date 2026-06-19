/**
 * LocalStorage persistence utility for FlyForge layout and session memory.
 * All keys are prefixed with "flyforge_" to avoid conflicts.
 */

const PREFIX = "flyforge_";

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore
  }
}

// ── Layout state ──
export const persistLayout = {
  getLeftOpen: () => get("leftOpen", true),
  setLeftOpen: (v: boolean) => set("leftOpen", v),

  getRightOpen: () => get("rightOpen", true),
  setRightOpen: (v: boolean) => set("rightOpen", v),

  getTopRatio: () => get("topRatio", 50),
  setTopRatio: (v: number) => set("topRatio", v),

  getCsVisible: () => get("csVisible", true),
  setCsVisible: (v: boolean) => set("csVisible", v),
};

// ── Last used params ──
export const persistSession = {
  getFlywheelType: () => get<number | null>("flywheelType", null),
  setFlywheelType: (v: number) => set("flywheelType", v),

  getMaterialId: () => get<string | null>("materialId", null),
  setMaterialId: (v: string) => set("materialId", v),
};

// ── Custom materials ──
export interface CustomMaterial {
  id: string;
  name_zh: string;
  density: number;
  yield_strength: number;
  tensile_strength: number;
  fatigue_limit: number;
}

export const persistCustomMaterials = {
  getAll: (): CustomMaterial[] => get("customMaterials", []),
  setAll: (materials: CustomMaterial[]) => set("customMaterials", materials),
  add: (m: CustomMaterial) => {
    const all = persistCustomMaterials.getAll();
    all.push(m);
    persistCustomMaterials.setAll(all);
  },
  remove: (id: string) => {
    const all = persistCustomMaterials.getAll().filter((m) => m.id !== id);
    persistCustomMaterials.setAll(all);
  },
};

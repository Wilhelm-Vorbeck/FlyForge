/**
 * Scheme management context — manages saved schemes for comparison.
 */
import { createContext, ParentComponent, createSignal, useContext, createEffect } from "solid-js";
import { SavedScheme, getAllSchemes, saveScheme, deleteScheme, renameScheme, clearAllSchemes } from "../utils/schemes";
import { FlywheelParams, Material, FlywheelSimulation } from "../types";

interface SchemeContextType {
  schemes: () => SavedScheme[];
  selectedIds: () => string[];
  saveCurrent: (name: string, params: FlywheelParams, material: Material, sim?: FlywheelSimulation | null) => SavedScheme;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  clearAll: () => void;
  toggleSelect: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectedSchemes: () => SavedScheme[];
  refresh: () => void;
}

const SchemeContext = createContext<SchemeContextType>();

export const SchemeProvider: ParentComponent = (props) => {
  const [schemes, setSchemes] = createSignal<SavedScheme[]>(getAllSchemes());
  const [selectedIds, setSelectedIds] = createSignal<string[]>([]);

  const refresh = () => setSchemes(getAllSchemes());

  const saveCurrent = (
    name: string,
    params: FlywheelParams,
    material: Material,
    sim?: FlywheelSimulation | null,
  ): SavedScheme => {
    const summary = sim
      ? {
          mass: sim.mass,
          moment_of_inertia: sim.moment_of_inertia,
          max_stress: sim.max_stress_rated,
          safety_yield: sim.actual_safety_yield,
          safety_fatigue: sim.actual_safety_fatigue,
          energy_rated: sim.energy_rated,
          energy_usable: sim.energy_usable,
          specific_energy: sim.specific_energy,
          safety_passed: sim.safety_passed,
        }
      : undefined;
    const scheme = saveScheme(name, params, material, summary);
    refresh();
    return scheme;
  };

  const remove = (id: string) => {
    deleteScheme(id);
    setSelectedIds((prev) => prev.filter((i) => i !== id));
    refresh();
  };

  const rename = (id: string, name: string) => {
    renameScheme(id, name);
    refresh();
  };

  const clearAll = () => {
    clearAllSchemes();
    setSelectedIds([]);
    refresh();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 4) return prev; // max 4 for comparison
      return [...prev, id];
    });
  };

  const isSelected = (id: string) => selectedIds().includes(id);

  const selectedSchemes = () => {
    const ids = selectedIds();
    return schemes().filter((s) => ids.includes(s.id));
  };

  const value: SchemeContextType = {
    schemes,
    selectedIds,
    saveCurrent,
    remove,
    rename,
    clearAll,
    toggleSelect,
    isSelected,
    selectedSchemes,
    refresh,
  };

  return <SchemeContext.Provider value={value}>{props.children}</SchemeContext.Provider>;
};

export const useSchemeContext = (): SchemeContextType => {
  const ctx = useContext(SchemeContext);
  if (!ctx) throw new Error("useSchemeContext must be used within SchemeProvider");
  return ctx;
};

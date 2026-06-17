import { createSignal, createContext, useContext, ParentComponent } from "solid-js";
import { FlywheelParams, FlywheelType, FlywheelSimulation, Material } from "../types";

// State type
interface AppState {
  params: FlywheelParams;
  simulation: FlywheelSimulation | null;
  isLoading: boolean;
  error: string | null;
  activePresetName: string | null;
}

// Context type
interface AppContextType {
  state: () => AppState;
  setParams: (params: Partial<FlywheelParams>) => void;
  setSimulation: (sim: FlywheelSimulation | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActivePreset: (name: string | null) => void;
  resetParams: () => void;
}

// Default parameters
const DEFAULT_PARAMS: FlywheelParams = {
  r_o: 200.0,
  r_i: 40.0,
  thickness: 50.0,
  r_hub: 60.0,
  hub_thickness: 80.0,
  rpm_rated: 3000.0,
  rpm_max: 4500.0,
  rpm_min: 1500.0,
  n_points: 100,
  flywheel_type: FlywheelType.AnnularRing,
  material_id: "aisi_4340",
  safety_factor_yield: 1.5,
  safety_factor_fatigue: 1.5,
  safety_factor_burst: 2.0,
};

// Create context
const AppContext = createContext<AppContextType>();

// Provider component
export const AppProvider: ParentComponent = (props) => {
  const [params, setParamsSignal] = createSignal<FlywheelParams>({ ...DEFAULT_PARAMS });
  const [simulation, setSimulation] = createSignal<FlywheelSimulation | null>(null);
  const [isLoading, setLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [activePresetName, setActivePresetName] = createSignal<string | null>(null);

  const state = (): AppState => ({
    params: params(),
    simulation: simulation(),
    isLoading: isLoading(),
    error: error(),
    activePresetName: activePresetName(),
  });

  const setParams = (newParams: Partial<FlywheelParams>) => {
    setParamsSignal((prev) => ({ ...prev, ...newParams }));
  };

  const setActivePreset = (name: string | null) => {
    setActivePresetName(name);
  };

  const resetParams = () => {
    setParamsSignal({ ...DEFAULT_PARAMS });
    setSimulation(null);
    setError(null);
    setActivePresetName(null);
  };

  const contextValue: AppContextType = {
    state,
    setParams,
    setSimulation,
    setLoading,
    setError,
    setActivePreset,
    resetParams,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {props.children}
    </AppContext.Provider>
  );
};

// Hook to use app context
export const useAppContext = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
};

export { DEFAULT_PARAMS };

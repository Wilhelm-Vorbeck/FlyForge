import { Component, createEffect, createSignal } from "solid-js";
import { useAppContext } from "../store";
import { runSimulationWithState } from "../services/api";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;
  const sim = () => ctx.state().simulation;

  // Auto compute on param change
  let debounceTimer: ReturnType<typeof setTimeout>;
  createEffect(() => {
    const params = p(); // subscribe to changes
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (!ctx.state().isLoading) {
        runSimulationWithState(params, ctx.setLoading, ctx.setError, ctx.setSimulation);
      }
    }, 300);
  });

  const maxR = () => p().r_o || 1;
  const scale = 120 / maxR();

  return (
    <div class="flex items-center justify-center">
      <div class="flex items-start space-x-6">
        {/* SVG Preview */}
        <div class="flex-shrink-0">
          <svg width="200" height="200" viewBox="-120 -120 240 240" class="bg-gray-900/50 rounded">
            {/* Grid lines */}
            <line x1="-120" y1="0" x2="120" y2="0" stroke="#374151" stroke-width="0.5" />
            <line x1="0" y1="-120" x2="0" y2="120" stroke="#374151" stroke-width="0.5" />

            {/* Outer circle (rim) */}
            <circle cx="0" cy="0" r={maxR() * scale} fill="none" stroke="#3B82F6" stroke-width="2" />

            {/* Inner circle (bore) */}
            {p().r_i > 0 && (
              <circle cx="0" cy="0" r={p().r_i * scale} fill="none" stroke="#10B981" stroke-width="1.5" />
            )}

            {/* Hub circle */}
            {p().r_hub > 0 && p().r_hub < p().r_o && (
              <circle cx="0" cy="0" r={p().r_hub * scale} fill="none" stroke="#8B5CF6" stroke-width="1" stroke-dasharray="4 4" />
            )}

            {/* Center dot */}
            <circle cx="0" cy="0" r="3" fill="#9CA3AF" />

            {/* Dimension labels */}
            <text x={maxR() * scale + 8} y="4" fill="#3B82F6" font-size="10">Ro={p().r_o}</text>
            {p().r_i > 0 && (
              <text x={p().r_i * scale + 8} y="4" fill="#10B981" font-size="10">Ri={p().r_i}</text>
            )}
          </svg>
        </div>

        {/* Info panel */}
        <div class="text-xs text-gray-400 space-y-2 min-w-[120px]">
          <div>
            <span class="text-gray-500">外径:</span>
            <span class="text-white ml-1">{p().r_o} mm</span>
          </div>
          <div>
            <span class="text-gray-500">内径:</span>
            <span class="text-white ml-1">{p().r_i} mm</span>
          </div>
          <div>
            <span class="text-gray-500">轮缘厚:</span>
            <span class="text-white ml-1">{p().thickness} mm</span>
          </div>
          <div>
            <span class="text-gray-500">轮毂径:</span>
            <span class="text-white ml-1">{p().r_hub} mm</span>
          </div>

          {sim() && (
            <div class="pt-2 border-t border-gray-700 space-y-1">
              <div>
                <span class="text-gray-500">质量:</span>
                <span class="text-green-400 ml-1">{sim()!.mass.toFixed(2)} kg</span>
              </div>
              <div>
                <span class="text-gray-500">最大应力:</span>
                <span class="text-yellow-400 ml-1">{sim()!.max_stress_rated.toFixed(1)} MPa</span>
              </div>
            </div>
          )}

          {ctx.state().error && (
            <div class="text-red-400 text-[10px] pt-2">
              {ctx.state().error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SectionPreview;

import { Component } from "solid-js";
import { useAppContext } from "../store";

const SectionPreview: Component = () => {
  const ctx = useAppContext();
  const p = () => ctx.state().params;

  const maxR = () => Math.max(p().r_o, 1);
  const rScale = () => Math.min(140 / maxR(), 2);

  return (
    <div class="w-full h-full flex items-center justify-center p-2">
      <svg width="100%" height="100%" viewBox="-160 -160 320 320" class="bg-gray-900/50 rounded"
        style={{ "min-height": "180px", "max-height": "100%" }}>
        <line x1="-160" y1="0" x2="160" y2="0" stroke="#374151" stroke-width="0.5" />
        <line x1="0" y1="-160" x2="0" y2="160" stroke="#374151" stroke-width="0.5" />
        <circle cx="0" cy="0" r={maxR() * rScale()} fill="rgba(59,130,246,0.1)" stroke="#3B82F6" stroke-width="2" />
        {p().r_i > 0 && (
          <circle cx="0" cy="0" r={p().r_i * rScale()} fill="#0b1120" stroke="#10B981" stroke-width="1.5" />
        )}
        {p().r_hub > 0 && p().r_hub < p().r_o && (
          <circle cx="0" cy="0" r={p().r_hub * rScale()} fill="none" stroke="#8B5CF6" stroke-width="1" stroke-dasharray="4 4" />
        )}
        <circle cx="0" cy="0" r="3" fill="#9CA3AF" />
        <text x="5" y={-maxR() * rScale() - 8} fill="#3B82F6" font-size="11">Ro={p().r_o}</text>
        {p().r_i > 0 && (
          <text x={p().r_i * rScale() + 8} y="4" fill="#10B981" font-size="11">Ri={p().r_i}</text>
        )}
        {p().r_hub > 0 && p().r_hub < p().r_o && (
          <text x={p().r_hub * rScale() + 8} y="-8" fill="#8B5CF6" font-size="10">Hub={p().r_hub}</text>
        )}
      </svg>
    </div>
  );
};

export default SectionPreview;

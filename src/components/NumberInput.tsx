import { Component, onCleanup } from "solid-js";

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  error?: boolean;
  errorMessage?: string;
}

const NumberInput: Component<NumberInputProps> = (props) => {
  const step = props.step ?? 1;
  const min = props.min ?? -Infinity;
  const max = props.max ?? Infinity;

  // Long press rapid fire
  let repeatTimer: ReturnType<typeof setInterval> | null = null;
  let startDelay: ReturnType<typeof setTimeout> | null = null;

  const startRepeat = (delta: number) => {
    // Apply once immediately
    const v = props.value + delta;
    if (v >= min && v <= max) props.onChange(v);

    // Start rapid fire after 200ms initial hold
    startDelay = setTimeout(() => {
      repeatTimer = setInterval(() => {
        const next = props.value + delta;
        if (next >= min && next <= max) {
          props.onChange(next);
        } else {
          stopRepeat();
        }
      }, 40);
    }, 200);
  };

  const stopRepeat = () => {
    if (startDelay) { clearTimeout(startDelay); startDelay = null; }
    if (repeatTimer) { clearInterval(repeatTimer); repeatTimer = null; }
  };

  onCleanup(stopRepeat);

  return (
    <div class="flex items-center justify-between">
      <label class="text-[10px] text-gray-400 w-12 flex-shrink-0">{props.label}</label>
      <div class="flex items-center flex-1 ml-2">
        <input
          type="text"
          inputmode="numeric"
          value={props.value}
          onInput={(e) => {
            const v = parseFloat(e.currentTarget.value);
            if (!isNaN(v)) props.onChange(Math.min(Math.max(v, min), max));
          }}
          class={`w-16 bg-[#111a22] border rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:ring-1 transition-colors ${
            props.error ? "border-red-500 focus:ring-red-500" : "border-[#1a2e22] focus:ring-emerald-500"
          }`}
        />
        <div class="flex flex-col ml-1">
          <button
            onMouseDown={(e) => { e.preventDefault(); startRepeat(step); }}
            onMouseUp={stopRepeat}
            onMouseLeave={stopRepeat}
            class="px-1.5 py-0 text-[9px] bg-[#1a2e22] hover:bg-[#2a4a32] text-emerald-300 rounded-t select-none transition-colors"
          >
            ▲
          </button>
          <button
            onMouseDown={(e) => { e.preventDefault(); startRepeat(-step); }}
            onMouseUp={stopRepeat}
            onMouseLeave={stopRepeat}
            class="px-1.5 py-0 text-[9px] bg-[#1a2e22] hover:bg-[#2a4a32] text-emerald-300 rounded-b select-none transition-colors"
          >
            ▼
          </button>
        </div>
        <span class="text-[9px] text-gray-500 w-8 ml-1">{props.unit}</span>
      </div>
      {props.error && props.errorMessage && (
        <p class="text-[8px] text-red-400 ml-14 mt-0.5 truncate" title={props.errorMessage}>{props.errorMessage}</p>
      )}
    </div>
  );
};

export default NumberInput;

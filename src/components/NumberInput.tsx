import { Component, createSignal, createEffect, onCleanup } from "solid-js";

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
  warning?: boolean;
  warningMessage?: string;
}

const NumberInput: Component<NumberInputProps> = (props) => {
  const step = props.step ?? 1;
  const min = props.min ?? -Infinity;
  const max = props.max ?? Infinity;

  // Local text buffer — separate from props.value to allow "12." typing
  const [text, setText] = createSignal(String(props.value));
  const [focused, setFocused] = createSignal(false);

  // Sync text from props when value changes externally (not from user typing)
  createEffect(() => {
    const v = props.value;
    if (!focused()) {
      setText(String(v));
    }
  });

  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (isNaN(v) || raw === "") {
      setText(String(props.value)); // restore
      return;
    }
    const clamped = Math.min(Math.max(v, min), max);
    props.onChange(clamped);
    setText(String(clamped));
  };

  // Determine decimal precision from step (e.g., step=0.1 → 1dp, step=1 → 0dp)
  const decimals = Math.max(0, Math.round(-Math.log10(step)));

  // Round to eliminate floating point noise
  const round = (n: number) => {
    const m = Math.pow(10, decimals);
    return Math.round(n * m) / m;
  };

  // Long press rapid fire
  let repeatTimer: ReturnType<typeof setInterval> | null = null;
  let startDelay: ReturnType<typeof setTimeout> | null = null;

  const startRepeat = (delta: number) => {
    const v = round(props.value + delta);
    if (v >= min && v <= max) props.onChange(v);
    startDelay = setTimeout(() => {
      repeatTimer = setInterval(() => {
        const next = round(props.value + delta);
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
          inputmode="decimal"
          value={text()}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            setText(raw);
            // Try to parse and fire onChange if valid
            const v = parseFloat(raw);
            if (!isNaN(v)) {
              const clamped = round(Math.min(Math.max(v, min), max));
              if (clamped !== props.value) props.onChange(clamped);
            }
          }}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            commit(e.currentTarget.value);
          }}
          class={`w-16 bg-[#111a22] border rounded px-2 py-1 text-xs text-white text-right focus:outline-none focus:ring-1 transition-colors ${
            props.error ? "border-red-500 focus:ring-red-500"
            : props.warning ? "border-yellow-600 focus:ring-yellow-500"
            : "border-[#1a2e22] focus:ring-emerald-500"
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
      {!props.error && props.warning && props.warningMessage && (
        <p class="text-[8px] text-yellow-500 ml-14 mt-0.5 truncate" title={props.warningMessage}>{props.warningMessage}</p>
      )}
    </div>
  );
};

export default NumberInput;

import { Component, createSignal, onCleanup } from "solid-js";

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

  // Local text buffer to allow intermediate typing (e.g. "12." → trailing dot)
  const [text, setText] = createSignal(String(props.value));

  // Sync from external value when not editing
  const syncFromProps = (external: number) => {
    // Only sync if the current text doesn't parse to the same number
    // (i.e. don't overwrite "12." with "12" while user is typing)
    const currentParsed = parseFloat(text());
    if (isNaN(currentParsed) || currentParsed !== external) {
      setText(String(external));
    }
  };

  // React to prop changes
  let lastPropValue = props.value;
  onCleanup(() => {});
  // Use a simple effect via the component body — Solid recreates this each time
  if (props.value !== lastPropValue) {
    lastPropValue = props.value;
    const currentParsed = parseFloat(text());
    if (isNaN(currentParsed) || Math.abs(currentParsed - props.value) > 0.001) {
      setText(String(props.value));
    }
  }

  const commit = (raw: string) => {
    const v = parseFloat(raw);
    if (isNaN(v)) {
      // Restore previous valid value
      setText(String(props.value));
      return;
    }
    const clamped = Math.min(Math.max(v, min), max);
    if (clamped !== props.value) {
      props.onChange(clamped);
    }
    setText(String(props.value !== clamped ? clamped : props.value));
  };

  // Long press rapid fire
  let repeatTimer: ReturnType<typeof setInterval> | null = null;
  let startDelay: ReturnType<typeof setTimeout> | null = null;

  const startRepeat = (delta: number) => {
    const v = props.value + delta;
    if (v >= min && v <= max) props.onChange(v);
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
          inputmode="decimal"
          value={text()}
          onInput={(e) => {
            const raw = e.currentTarget.value;
            // Allow intermediate states like "12.", ".5", "10.0"
            // Only reject obviously non-numeric typing
            if (raw === "" || raw === "-" || raw === "." || raw.endsWith(".") || raw.endsWith("0") && raw.includes(".")) {
              setText(raw);
              // Try to parse partially — if we get NaN, keep the text as-is
              const v = parseFloat(raw);
              if (isNaN(v)) return;
              if (v >= min && v <= max) props.onChange(v);
              return;
            }
            setText(raw);
            const v = parseFloat(raw);
            if (!isNaN(v)) {
              const clamped = Math.min(Math.max(v, min), max);
              if (clamped !== props.value) props.onChange(clamped);
            }
          }}
          onBlur={(e) => commit(e.currentTarget.value)}
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

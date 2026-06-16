import { Component, ErrorBoundary as SolidErrorBoundary, ParentComponent } from "solid-js";

const ErrorFallback: Component<{ error: Error; reset: () => void }> = (props) => {
  return (
    <div class="min-h-screen bg-gray-900 flex items-center justify-center p-8">
      <div class="bg-gray-800 rounded-lg p-8 max-w-md w-full text-center border border-gray-700">
        <svg
          class="w-16 h-16 mx-auto mb-4 text-red-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <h2 class="text-xl font-bold text-white mb-2">发生错误</h2>
        <p class="text-gray-400 mb-4">{props.error.message}</p>
        <div class="bg-gray-900 rounded-lg p-3 mb-4 text-left">
          <pre class="text-xs text-gray-500 overflow-auto max-h-32">
            {props.error.stack?.slice(0, 500)}
          </pre>
        </div>
        <button
          onClick={props.reset}
          class="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          重新加载
        </button>
      </div>
    </div>
  );
};

const AppErrorBoundary: ParentComponent = (props) => {
  return (
    <SolidErrorBoundary fallback={(error, reset) => <ErrorFallback error={error} reset={reset} />}>
      {props.children}
    </SolidErrorBoundary>
  );
};

export default AppErrorBoundary;

export function RouteLoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
      <div role="status" aria-live="polite">
        Loading page...
      </div>
    </div>
  );
}

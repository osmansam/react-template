const Loading = () => {
  return (
    <div className="fixed inset-0 w-full h-full z-[60]">
      <div className="absolute inset-0 w-full h-full z-[60] bg-white/80 backdrop-blur-sm">
        <div className="flex justify-center w-full h-full items-center">
          <div className="flex flex-col items-center gap-3">
            <svg
              className="animate-spin h-8 w-8 text-neutral-900"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-20"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
              ></circle>
              <path
                className="opacity-90"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <h1 className="text-sm font-medium text-neutral-700">Loading...</h1>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Loading;

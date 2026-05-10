"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-8">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-red-400">Something went wrong</h2>
        <p className="text-sm text-zinc-400">
          {error.message || "An unexpected error occurred"}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

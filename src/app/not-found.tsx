import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-8">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Page not found</h2>
        <p className="text-sm text-zinc-400">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

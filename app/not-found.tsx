import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold">
          4<span className="orange-text">0</span>4
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! That page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="btn btn-primary"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

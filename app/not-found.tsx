import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold">
          4<span className="orange-text">0</span>4
        </h1>
        <p className="mb-6 text-lg text-muted-foreground">
          Oops! That page doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="signup-gradient-hover glass-button inline-flex h-10 items-center rounded-md border-border px-4 text-sm font-medium text-foreground transition-all duration-200"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}

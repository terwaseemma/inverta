import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="container py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-semibold">Inverta Platform</h1>
        <p className="text-muted-foreground">
          The installer dashboard and auth flow are planned for upcoming slices. The
          public calculator is live — try it with the seeded demo installer below.
        </p>
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-medium">Demo calculator</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Public, branded calculator for <code>demo-solar</code>.
          </p>
          <Link
            href="/calc/demo-solar"
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Open /calc/demo-solar
          </Link>
        </div>
      </div>
    </main>
  );
}

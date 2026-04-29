import Link from 'next/link';
import { ArrowRight, Calculator, FileText, Users } from 'lucide-react';
import { Wordmark, BrandIcon } from '@/components/brand/Wordmark';

export default function HomePage() {
  return (
    <main className="min-h-screen hero-gradient">
      <header className="container flex h-20 items-center justify-between">
        <div className="flex items-center gap-2">
          <BrandIcon size={28} />
          <Wordmark size="sm" />
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-foreground/80 transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="signup-gradient-hover glass-button inline-flex h-10 items-center rounded-md border-border px-4 text-sm font-medium text-foreground transition-all duration-200"
          >
            Sign up
          </Link>
        </div>
      </header>

      <section className="container py-20 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl lg:text-7xl">
            Solar quotation
          </h1>
          <h1 className="text-5xl font-bold italic tracking-tight orange-text md:text-6xl lg:text-7xl">
            made easy.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Build your branded solar calculator, share one link, capture leads,
            and send PDF proposals — all from one dashboard.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="signup-gradient-hover glass-button inline-flex h-12 items-center gap-2 rounded-md border-border px-6 text-base font-medium text-foreground transition-all duration-200"
            >
              Create your calculator <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/calc/demo-solar"
              className="inline-flex h-12 items-center rounded-md px-6 text-base font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              Try the demo →
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-6 md:grid-cols-3">
          <Feature
            icon={<Calculator className="h-5 w-5" />}
            title="Branded calculator"
            body="One shareable link sized to your catalog. Customers fill it in; you get a complete sizing on the other side."
          />
          <Feature
            icon={<Users className="h-5 w-5" />}
            title="Leads inbox"
            body="Every submission lands in your dashboard with the customer's contact info and a snapshot of the result."
          />
          <Feature
            icon={<FileText className="h-5 w-5" />}
            title="Proposal PDFs"
            body="Adjust line items if needed, click generate, and send a polished PDF proposal to the customer."
          />
        </div>
      </section>

      <footer className="container border-t border-border/40 py-8 text-center text-xs text-muted-foreground">
        Built for solar installers in Nigeria · {new Date().getFullYear()}
      </footer>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card/40 p-6 backdrop-blur">
      <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

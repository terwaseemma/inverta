import Link from 'next/link';
import { Calculator, FileText, Share2, Sun, Users, Zap } from 'lucide-react';
import { Header } from '@/components/marketing/Header';
import { Footer } from '@/components/marketing/Footer';

export const metadata = {
  title: 'About · Inverta',
  description:
    'Inverta helps Nigerian solar installers quote faster, capture more leads, and close more sales.',
};

export default function AboutPage() {
  return (
    <div className="hero-gradient flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        <section className="container max-w-4xl py-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">
            Solar sales, <span className="orange-text italic">without the spreadsheets.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
            Inverta gives every solar installer a branded calculator, an automatic
            lead inbox, and professional proposal PDFs — so quoting a customer takes
            minutes, not days.
          </p>
        </section>

        <section className="container max-w-5xl pb-16">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works for installers</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Step
              icon={<Calculator className="h-5 w-5" />}
              n="1"
              title="Set up your calculator"
              body="Sign up, add your products and prices (or start with our template), and get a branded calculator link in minutes."
            />
            <Step
              icon={<Share2 className="h-5 w-5" />}
              n="2"
              title="Share one link"
              body="WhatsApp status, Instagram bio, flyers — customers size their own system and every submission lands in your lead inbox."
            />
            <Step
              icon={<FileText className="h-5 w-5" />}
              n="3"
              title="Send proposals that close"
              body="Turn any lead into a professional PDF proposal — load analysis, cost breakdown, and your payment details — in two clicks."
            />
          </div>
        </section>

        <section className="border-y border-border/40 bg-background/30 py-16 backdrop-blur">
          <div className="container max-w-4xl">
            <h2 className="mb-8 text-center text-2xl font-bold">
              And for homes &amp; businesses
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card/60 p-6 backdrop-blur">
                <Sun className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">Know what you need — free</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Pick your appliances, tell us your backup needs, and get an instant
                  system sizing: inverter, batteries, and panels — with real prices
                  from a local installer.
                </p>
              </div>
              <div className="rounded-xl border bg-card/60 p-6 backdrop-blur">
                <Users className="h-6 w-6 text-primary" />
                <h3 className="mt-3 font-semibold">Work with trusted installers</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Every calculator on Inverta belongs to a real installer who follows
                  up with a formal quote — browse them by state and pick who you work
                  with.
                </p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href={`/calc/${process.env.NEXT_PUBLIC_DEFAULT_CALCULATOR_SLUG ?? 'boost-power'}`}
                className="signup-gradient-hover glass-button inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium text-foreground transition-all duration-200"
              >
                <Zap className="h-4 w-4" /> Calculate your solar
              </Link>
              <Link
                href="/installers"
                className="inline-flex h-11 items-center rounded-md border bg-background/40 px-6 text-sm font-medium backdrop-blur transition-colors hover:bg-secondary"
              >
                Browse installers
              </Link>
            </div>
          </div>
        </section>

        <section className="container max-w-3xl py-16 text-center">
          <h2 className="text-2xl font-bold">Ready to grow your solar business?</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Setup takes five minutes. Your calculator link is free to share, and
            every submission is a lead you&apos;d otherwise never have met.
          </p>
          <Link
            href="/signup"
            className="signup-gradient-hover glass-button mt-6 inline-flex h-12 items-center rounded-md px-8 text-base font-medium text-foreground transition-all duration-200"
          >
            Create your calculator
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function Step({
  icon,
  n,
  title,
  body,
}: {
  icon: React.ReactNode;
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border bg-card/60 p-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary">
          {icon}
        </div>
        <span className="text-3xl font-bold text-border">{n}</span>
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}

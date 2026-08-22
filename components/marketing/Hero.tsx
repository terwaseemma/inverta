import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

// Marketing hero — ported from the Vite site. The CTA now points to /signup
// (real installer signup) instead of the bit.ly holding link.
export function Hero() {
  return (
    <section className="flex-1 px-6 py-12 lg:ml-[70px] lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="relative z-10 space-y-8 text-center md:text-left">
            <div className="flex justify-center md:justify-start">
              <Image
                src="/wordmark.png"
                alt="Inverta"
                width={140}
                height={24}
                className="wordmark-gray h-4 w-auto md:h-6"
                priority
              />
            </div>

            <div className="space-y-2">
              <h1 className="text-5xl font-bold leading-tight text-foreground md:text-6xl lg:text-7xl xl:text-8xl">
                Solar sales
              </h1>
              <h1 className="orange-text text-5xl font-bold italic leading-tight md:text-6xl lg:text-7xl xl:text-8xl">
                made easy.
              </h1>
            </div>

            <p className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground md:mx-0 md:text-xl">
              Create an AI-powered solar calculator, share to customers, get instant quotes,
              and buy and sell quality solar products.
            </p>

            {/* Buttons stack until lg — on tablets the hero image bleeds left
                and a side-by-side pair would collide with it. */}
            <div className="flex flex-col items-center gap-3 sm:flex-row md:flex-col md:items-start lg:flex-row">
              <Link href="/signup" className="inline-block">
                <Button
                  className="signup-gradient-hover glass-button h-11 w-full rounded-lg border-border px-6 text-base font-medium text-foreground transition-all duration-200 sm:w-auto"
                >
                  Create your solar calculator
                </Button>
              </Link>
              <Link
                href={`/calc/${process.env.NEXT_PUBLIC_DEFAULT_CALCULATOR_SLUG ?? 'boostsolar'}`}
                className="inline-block"
              >
                <Button
                  variant="outline"
                  className="h-11 w-full rounded-lg border-primary/40 bg-primary/10 px-6 text-base font-medium text-foreground transition-colors hover:bg-primary/20 sm:w-auto"
                >
                  Calculate your solar ☀️
                </Button>
              </Link>
            </div>
            <p className="relative z-10 text-xs text-muted-foreground">
              Not an installer? Use the calculator to size a system for your home or
              business — free, instant.
            </p>
          </div>

          <div className="relative z-0 sm:-ml-24 md:-ml-16 lg:-ml-28 xl:-ml-40 2xl:-ml-52">
            <Image
              src="/hero-image.png"
              alt="Inverta solar calculator interface"
              width={1200}
              height={900}
              /* Mobile offset is -50px, not the -110px the other breakpoints
                 scale from: the phone in the PNG sits ~60% across its canvas
                 (the left third is just background glow), so centring the
                 image box would throw the actual subject right of centre.
                 -50px puts the phone on the viewport centre line. */
              className="pointer-events-none mx-auto h-auto w-full -translate-x-[50px] scale-[1.6] select-none sm:-translate-x-24 md:-translate-x-24 md:scale-125 lg:-translate-x-32 xl:-translate-x-40 xl:scale-150 2xl:-translate-x-56 2xl:scale-[1.65]"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  );
}

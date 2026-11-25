import Link from 'next/link';
import Image from 'next/image';

const DEMO_SLUG = process.env.NEXT_PUBLIC_DEFAULT_CALCULATOR_SLUG ?? 'boostsolar';

// The hero is the product itself: the calculator on a phone in its original
// glow. The image bleeds on purpose; the section clips it so the page never
// scrolls sideways.
export function Hero() {
  return (
    // At least one screen under the 80px header, content centred in it, so the
    // first screen is the hero alone and the footer starts below the fold.
    <section className="relative flex min-h-[calc(100svh-5rem)] flex-1 flex-col justify-center overflow-x-clip">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] top-[10%] h-[620px] w-[620px] rounded-full opacity-60 blur-3xl md:right-[5%]"
        style={{ background: 'radial-gradient(closest-side, hsl(var(--primary) / 0.28), transparent)' }}
      />

      <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-10 px-4 pb-16 pt-6 sm:px-6 md:grid-cols-2 lg:px-8 lg:pb-24">
        <div className="relative z-10 text-center md:text-left">
          <h1 className="text-[52px] font-semibold leading-[0.98] tracking-[-0.035em] sm:text-[64px] lg:text-[84px]">
            Solar sales
            <span className="block italic text-link">made easy.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[34ch] text-[18px] leading-relaxed text-muted-foreground md:mx-0 lg:text-[20px]">
            Your own solar calculator: customers size their system and see your price in
            two minutes, and you get the lead.
          </p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center md:justify-start">
            <Link href="/signup" className="btn btn-primary h-12 px-7 text-base">
              Create your solar calculator
            </Link>
            <Link href={`/calc/${DEMO_SLUG}`} className="btn btn-secondary h-12 px-7 text-base">
              Try the calculator
            </Link>
          </div>

          <p className="mt-5 text-[15px] text-muted-foreground">
            Not an installer? The calculator sizes a system for your home or business —
            free.
          </p>
        </div>

        <div className="relative z-0 sm:-ml-24 md:-ml-16 lg:-ml-28 xl:-ml-40 2xl:-ml-52">
          <Image
            src="/hero-image.png"
            alt="The Inverta solar calculator on a phone, showing a customer's appliance list and quote"
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
    </section>
  );
}

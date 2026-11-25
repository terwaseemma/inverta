import Link from 'next/link';
import { Instagram, Linkedin, Mail, Twitter } from 'lucide-react';
import { Wordmark } from '@/components/brand/Wordmark';

const NAV = [
  { label: 'About', href: '/about' },
  { label: 'Installers', href: '/installers' },
  { label: 'Sign in', href: '/login' },
];

const SOCIAL = [
  { label: 'Email', href: 'https://bit.ly/Inverta', Icon: Mail },
  { label: 'Twitter', href: 'https://bit.ly/Inverta', Icon: Twitter },
  { label: 'LinkedIn', href: 'https://bit.ly/Inverta', Icon: Linkedin },
  { label: 'Instagram', href: 'https://bit.ly/Inverta', Icon: Instagram },
];

export function Footer() {
  return (
    <footer className="relative z-20 w-full border-t">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center justify-between gap-6 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
        <div className="flex flex-col items-center gap-5 md:flex-row md:gap-8">
          {/* The wordmark ships white; Wordmark applies the theme-aware filter. */}
          <Wordmark size="sm" />
          <nav aria-label="Footer" className="flex items-center gap-6 text-[15px]">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          {SOCIAL.map(({ label, href, Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost h-11 w-11 px-0"
            >
              <Icon className="h-5 w-5" />
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

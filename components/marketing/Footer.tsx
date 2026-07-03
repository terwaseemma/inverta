import Image from 'next/image';
import Link from 'next/link';
import { Mail, Twitter, Linkedin, Instagram } from 'lucide-react';

const NAV = [
  { label: 'About', href: '/about', external: false },
  { label: 'Installers', href: '/installers', external: false },
];

const SOCIAL = [
  { label: 'Email', href: 'https://bit.ly/Inverta', Icon: Mail },
  { label: 'Twitter', href: 'https://bit.ly/Inverta', Icon: Twitter },
  { label: 'LinkedIn', href: 'https://bit.ly/Inverta', Icon: Linkedin },
  { label: 'Instagram', href: 'https://bit.ly/Inverta', Icon: Instagram },
];

export function Footer() {
  return (
    <footer className="relative z-20 w-full border-t border-border/20 px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center justify-between space-y-6 md:flex-row md:space-y-0">
          <div className="flex flex-col items-center space-y-4 md:flex-row md:space-x-8 md:space-y-0">
            <Image
              src="/wordmark.png"
              alt="Inverta"
              width={80}
              height={16}
              className="h-4 w-auto"
            />
            <div className="flex items-center space-x-6 text-sm">
              {NAV.map((n) =>
                n.external ? (
                  <a
                    key={n.label}
                    href={n.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {n.label}
                  </a>
                ) : (
                  <Link
                    key={n.label}
                    href={n.href}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {n.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {SOCIAL.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                className="p-2 text-muted-foreground transition-colors hover:text-foreground"
                aria-label={label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon className="h-5 w-5" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

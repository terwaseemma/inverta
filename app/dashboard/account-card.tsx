import { LogoutButton } from './logout-button';

// Who is signed in, at the foot of the sidebar and the mobile drawer. The
// initial stands in for a logo the installer may not have uploaded.
export function AccountCard({
  businessName,
  email,
  logoUrl,
}: {
  businessName: string;
  email: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-secondary p-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt=""
          className="h-10 w-10 shrink-0 rounded-xl bg-card object-contain p-1"
        />
      ) : (
        <span
          aria-hidden
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-base font-semibold text-primary-foreground"
        >
          {businessName.trim()[0]?.toUpperCase() ?? 'I'}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">{businessName}</div>
        <div className="truncate text-[13px] text-muted-foreground">{email}</div>
      </div>
      <LogoutButton />
    </div>
  );
}

import {
  LayoutDashboard,
  Package,
  Users,
  FileText,
  Store,
  Settings,
  type LucideIcon,
} from 'lucide-react';

// Shared nav config so the desktop sidebar and the mobile drawer stay in sync.

export interface NavItem {
  href: string;
  label: string;
  Icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Overview', Icon: LayoutDashboard },
  { href: '/dashboard/leads', label: 'Leads', Icon: Users },
  { href: '/dashboard/proposals', label: 'Proposals', Icon: FileText },
  { href: '/dashboard/catalog', label: 'Catalog', Icon: Package },
  { href: '/dashboard/store', label: 'Store', Icon: Store },
  { href: '/dashboard/settings', label: 'Settings', Icon: Settings },
];

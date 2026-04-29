import {
  LayoutDashboard,
  Users,
  HeartHandshake,
  Siren,
  Megaphone,
  HandCoins,
  PackageSearch,
  FileText,
  MessageSquare,
  ScrollText,
  ClipboardList,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  /** Path relative to the admin root, e.g. '' for the dashboard, '/users' etc. */
  path: string;
  label: string;
  icon: LucideIcon;
}

export const ADMIN_NAV: NavItem[] = [
  { path: '', label: 'Dashboard Overview', icon: LayoutDashboard },
  { path: '/users', label: 'User Management', icon: Users },
  { path: '/volunteers', label: 'Volunteer Management', icon: HeartHandshake },
  { path: '/disasters', label: 'Disaster Monitoring', icon: Siren },
  { path: '/tasks', label: 'Task Management', icon: ClipboardList },
  { path: '/campaigns', label: 'Campaign Management', icon: Megaphone },
  { path: '/donations', label: 'Donation Tracking', icon: HandCoins },
  { path: '/resources', label: 'Resource Management', icon: PackageSearch },
  { path: '/reports', label: 'Reports', icon: FileText },
  { path: '/chats', label: 'Chat Monitoring', icon: MessageSquare },
  { path: '/logs', label: 'System Logs', icon: ScrollText },
];

/** Build a fully-qualified admin URL from a relative `NavItem.path`. */
export const buildNavHref = (slug: string, path: string): string => {
  if (!path) return `/${slug}`;
  return `/${slug}${path}`;
};

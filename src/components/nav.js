import {
  Home, ClipboardCheck, MapPin, Users, UserSearch, GitBranch, Backpack, RotateCcw, Shield, Settings,
  Store, HardHat, TriangleAlert, LayoutDashboard, KanbanSquare, Truck, Building2, BarChart3,
  Siren, UserCheck, ScrollText, Bell,
} from 'lucide-react';

export const ROLE_HOME = {
  household: '/home',
  business: '/biz',
  worker: '/worker',
  rescue: '/responder',
  admin: '/admin',
};

export const ROLE_LABEL = {
  household: 'Household',
  business: 'Shop owner',
  worker: 'Shop worker',
  rescue: 'Rescue team',
  admin: 'Admin',
};

export const DESKTOP_ROLES = ['rescue', 'admin'];

// The first four items appear in the mobile bottom bar; the rest go under "More".
export const NAV = {
  household: [
    { to: '/home', label: 'Home', icon: Home, end: true },
    { to: '/home/checkin', label: 'Am I safe?', icon: ClipboardCheck },
    { to: '/safe-places', label: 'Safe places', icon: MapPin },
    { to: '/home/grab', label: 'Grab list', icon: Backpack },
    { to: '/home/members', label: 'My family', icon: Users },
    { to: '/home/alerts', label: 'Missing person alerts', icon: UserSearch },
    { to: '/home/escalation', label: "If we can't reach you", icon: GitBranch },
    { to: '/home/recovery', label: 'After the disaster', icon: RotateCcw },
    { to: '/notifications', label: 'Messages', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/privacy', label: 'Privacy', icon: Shield },
  ],
  business: [
    { to: '/biz', label: 'Home', icon: Store, end: true },
    { to: '/biz/checkin', label: 'Is everyone safe?', icon: ClipboardCheck },
    { to: '/biz/workers', label: 'Workers', icon: HardHat },
    { to: '/biz/grab', label: 'Grab list', icon: Backpack },
    { to: '/safe-places', label: 'Safe places', icon: MapPin },
    { to: '/biz/hazard', label: 'Report danger', icon: TriangleAlert },
    { to: '/biz/recovery', label: 'After the disaster', icon: RotateCcw },
    { to: '/notifications', label: 'Messages', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/privacy', label: 'Privacy', icon: Shield },
  ],
  worker: [
    { to: '/worker', label: 'Home', icon: Home, end: true },
    { to: '/safe-places', label: 'Safe places', icon: MapPin },
    { to: '/notifications', label: 'Messages', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
    { to: '/privacy', label: 'Privacy', icon: Shield },
  ],
  rescue: [
    { to: '/responder', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/responder/board', label: 'Rescue board', icon: KanbanSquare },
    { to: '/responder/team', label: 'Teams & resources', icon: Truck },
    { to: '/responder/safety-points', label: 'Safety points', icon: Building2 },
    { to: '/responder/summary', label: 'Post-event summary', icon: BarChart3 },
    { to: '/notifications', label: 'Messages', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  admin: [
    { to: '/admin', label: 'Event control', icon: Siren, end: true },
    { to: '/admin/approvals', label: 'Approval queue', icon: UserCheck },
    { to: '/admin/access-log', label: 'Access log & reports', icon: ScrollText },
    { to: '/responder/summary', label: 'Post-event summary', icon: BarChart3 },
    { to: '/notifications', label: 'Messages', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
};

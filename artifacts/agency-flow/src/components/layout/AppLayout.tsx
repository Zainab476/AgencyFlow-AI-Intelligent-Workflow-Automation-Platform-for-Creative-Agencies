import { ReactNode, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  LogOut, 
  UserCircle,
  Menu,
  CheckSquare,
  Bell,
  Activity,
  FileText,
  Sparkles,
  Table2,
  Webhook,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { useGetMe, useListNotifications } from '@workspace/api-client-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const { data: user, isError } = useGetMe();

  useEffect(() => {
    if (isError) {
      logout();
    }
  }, [isError, logout]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Clients', href: '/clients', icon: Users },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'Tasks', href: '/tasks', icon: CheckSquare },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Sheets', href: '/sheets', icon: Table2 },
    { name: 'Workflows', href: '/workflows', icon: Webhook },
    { name: 'Notifications', href: '/notifications', icon: Bell },
    { name: 'Activity', href: '/activity', icon: Activity },
  ];

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const SidebarContent = () => {
    const { data: unreadNotifications } = useListNotifications({ unreadOnly: true });
    const unreadCount = unreadNotifications?.length || 0;

    return (
      <div className="flex h-full flex-col bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
        <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground">
              A
            </div>
            <span className="text-sidebar-foreground">AgencyFlow</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4">
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => {
              const isActive = location === item.href || location.startsWith(`${item.href}/`);
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                      isActive 
                        ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5" />
                      {item.name}
                    </div>
                    {item.name === 'Notifications' && unreadCount > 0 && (
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sidebar-primary text-[10px] font-bold text-sidebar-primary-foreground">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>

      <div className="p-4 border-t border-sidebar-border">
        <Link href="/profile">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer mb-2">
            <Avatar className="h-9 w-9 bg-sidebar-primary/20 text-sidebar-primary border border-sidebar-primary/20">
              <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-sidebar-foreground">{user?.name || 'Loading...'}</span>
              <span className="text-xs text-sidebar-foreground/60">{user?.email || ''}</span>
            </div>
          </div>
        </Link>
        <Link href="/settings">
          <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-sidebar-accent/50 transition-colors cursor-pointer mb-2">
            <Settings className="h-4 w-4" />
            <span className="text-sm text-sidebar-foreground/80">Settings</span>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" 
          onClick={() => logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </Button>
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Mobile header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 font-bold text-lg">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center text-primary-foreground text-xs">
            A
          </div>
          <span>AgencyFlow</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-0">
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex w-64 flex-col fixed inset-y-0 z-50">
        <SidebarContent />
      </div>

      {/* Main content */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-[100dvh]">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
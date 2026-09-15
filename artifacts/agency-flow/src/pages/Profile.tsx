import { useGetMe } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, CalendarDays, LogOut, KeyRound, ShieldCheck, Settings as SettingsIcon } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { data: user, isLoading } = useGetMe();
  const { logout } = useAuth();

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48 mb-8" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card className="border-border/50 shadow-sm text-center pt-8 border-t-4 border-t-primary">
            <CardContent className="flex flex-col items-center">
              <Avatar className="h-24 w-24 mb-4 border-4 border-background shadow-sm">
                <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <p className="text-sm text-muted-foreground mb-6">{user.email}</p>
              
              <Button variant="outline" className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Personal details and security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Full Name
                  </p>
                  <p className="font-medium text-foreground">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Address
                  </p>
                  <p className="font-medium text-foreground">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    Member Since
                  </p>
                  <p className="font-medium text-foreground">
                    {format(new Date(user.createdAt), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                    <KeyRound className="h-4 w-4" />
                    Role
                  </p>
                  <p className="font-medium text-foreground capitalize">{user.role ?? 'employee'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm bg-muted/30">
            <CardHeader>
              <CardTitle className="text-base">Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you need assistance with your account or have questions about using AgencyFlow, our support team is ready to help.
              </p>
              <Button variant="secondary" size="sm">Contact Support</Button>
              <Link href="/settings">
                <Button variant="outline" size="sm" className="ml-2">
                  <SettingsIcon className="mr-2 h-4 w-4" />Manage Settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
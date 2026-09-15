import { useEffect, useMemo, useState } from 'react';
import { useGetMe } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Bell, Check, Mail, Moon, Palette, Save, Shield, SlidersHorizontal, User, X } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

type EmailPreferenceKey = 'projectUpdates' | 'weeklyDigest' | 'documentAlerts' | 'workflowNotifications';

type EmailPreferences = Record<EmailPreferenceKey, boolean>;

export default function Settings() {
  const { data: user, isLoading } = useGetMe();
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('agencyflow-theme') as ThemeMode | null;
    return stored ?? 'light';
  });

  const [profile, setProfile] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    role: user?.role ?? 'employee',
  });

  const [preferences, setPreferences] = useState<EmailPreferences>({
    projectUpdates: true,
    weeklyDigest: false,
    documentAlerts: true,
    workflowNotifications: true,
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name,
        email: user.email,
        role: user.role ?? 'employee',
      });
    }
  }, [user]);

  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.classList.toggle('dark', isDark);
    localStorage.setItem('agencyflow-theme', theme);
  }, [theme]);

  const roleLabel = useMemo(() => {
    return profile.role
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }, [profile.role]);

  const togglePreference = (key: EmailPreferenceKey) => {
    setPreferences((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  const saveSettings = () => {
    localStorage.setItem('agencyflow-settings-profile', JSON.stringify(profile));
    localStorage.setItem('agencyflow-settings-email-preferences', JSON.stringify(preferences));
  };

  if (isLoading || !user) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-8">
            <div className="h-7 w-40 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Workspace Settings</p>
            <h1 className="mt-2 text-4xl font-bold tracking-tight">Settings</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? <Moon className="mr-2 h-4 w-4" /> : <SunIcon className="mr-2 h-4 w-4" />}
              {theme === 'light' ? 'Dark mode' : 'Light mode'}
            </Button>
            <Button onClick={saveSettings}>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <aside className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-8">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-20 w-20 border-4 border-background shadow-md">
                    <AvatarFallback className="text-2xl bg-primary/10 text-primary font-bold">
                      {getInitials(profile.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="mt-5">
                    <h2 className="text-2xl font-bold tracking-tight">{profile.name}</h2>
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">{roleLabel}</span>
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">{profile.email}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" /> Appearance
                </CardTitle>
                <CardDescription>Choose how AgencyFlow surfaces for your team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Theme</p>
                    <p className="text-sm text-muted-foreground">{theme === 'light' ? 'Light interface' : 'Dark interface'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')}>Light</Button>
                    <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')}>Dark</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="space-y-6">
            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Profile details
                </CardTitle>
                <CardDescription>Edit basic account information.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full name</Label>
                    <Input id="name" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="role">Team role</Label>
                    <Input id="role" value={roleLabel} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input id="department" value="Creative Operations" disabled />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Email preferences
                </CardTitle>
                <CardDescription>Control the update stream for your workspace.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {[
                    ['projectUpdates', 'Project updates', 'Track progress and project milestones'],
                    ['weeklyDigest', 'Weekly digest', 'Summaries of tasks, clients, and project velocity'],
                    ['documentAlerts', 'Document alerts', 'Notifications when proposals, docs, or contracts are ready'],
                    ['workflowNotifications', 'Workflow alerts', 'Automation and webhook delivery notices'],
                  ].map(([key, title, description]) => (
                    <div className="flex items-center justify-between gap-4 rounded-xl border border-border/60 p-4">
                      <div className="space-y-1">
                        <div className="font-medium">{title}</div>
                        <div className="text-sm text-muted-foreground">{description}</div>
                      </div>
                      <Switch
                        aria-label={title}
                        checked={preferences[key as EmailPreferenceKey]}
                        onCheckedChange={() => togglePreference(key as EmailPreferenceKey)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" /> Security & workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div>
                    <div className="font-medium">Session protection</div>
                    <div className="text-sm text-muted-foreground">Keep token-based access protected.</div>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" /> Active
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div>
                    <div className="font-medium">API access scope</div>
                    <div className="text-sm text-muted-foreground">{roleLabel} workspace permissions</div>
                  </div>
                  <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {roleLabel}
                  </span>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

function getInitials(name?: string) {
  if (!name) return 'AF';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function SunIcon(props: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={props.className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

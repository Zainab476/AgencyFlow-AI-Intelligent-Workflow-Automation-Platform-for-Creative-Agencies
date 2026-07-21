import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, Redirect } from 'wouter';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/contexts/useAuth';

import AppLayout from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Dashboard from '@/pages/Dashboard';
import Clients from '@/pages/Clients';
import ClientDetail from '@/pages/ClientDetail';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import Profile from '@/pages/Profile';
import Tasks from '@/pages/Tasks';
import Notifications from '@/pages/Notifications';
import ActivityLog from '@/pages/ActivityLog';
import Documents from '@/pages/Documents';
import Sheets from '@/pages/Sheets';
import Workflows from '@/pages/Workflows';
import Analytics from '@/pages/Analytics';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, params, ...rest }: { component: any, path: string, params?: any }) {
  const { isAuthenticated, isInitializing } = useAuth();
  
  if (isInitializing) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <AppLayout>
      <Component {...rest} {...params} />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
      
      <Route path="/dashboard">
        {() => <ProtectedRoute component={Dashboard} path="/dashboard" />}
      </Route>
      <Route path="/clients">
        {() => <ProtectedRoute component={Clients} path="/clients" />}
      </Route>
      <Route path="/clients/:id">
        {(params) => <ProtectedRoute component={ClientDetail} path="/clients/:id" params={params} />}
      </Route>
      <Route path="/projects">
        {() => <ProtectedRoute component={Projects} path="/projects" />}
      </Route>
      <Route path="/projects/:id">
        {(params) => <ProtectedRoute component={ProjectDetail} path="/projects/:id" params={params} />}
      </Route>
      <Route path="/profile">
        {() => <ProtectedRoute component={Profile} path="/profile" />}
      </Route>
      <Route path="/tasks">
        {() => <ProtectedRoute component={Tasks} path="/tasks" />}
      </Route>
      <Route path="/notifications">
        {() => <ProtectedRoute component={Notifications} path="/notifications" />}
      </Route>
      <Route path="/activity">
        {() => <ProtectedRoute component={ActivityLog} path="/activity" />}
      </Route>
      <Route path="/documents">
        {() => <ProtectedRoute component={Documents} path="/documents" />}
      </Route>
      <Route path="/sheets">
        {() => <ProtectedRoute component={Sheets} path="/sheets" />}
      </Route>
      <Route path="/workflows">
        {() => <ProtectedRoute component={Workflows} path="/workflows" />}
      </Route>
      <Route path="/analytics">
        {() => <ProtectedRoute component={Analytics} path="/analytics" />}
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
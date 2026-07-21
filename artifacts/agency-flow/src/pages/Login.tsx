import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLogin } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/useAuth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        authenticate(data.token);
        toast.success('Welcome back!');
        setLocation('/dashboard');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to sign in. Please check your credentials.');
      },
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12 relative overflow-hidden">
        {/* Abstract background pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sidebar-primary blur-3xl"></div>
          <div className="absolute bottom-12 -left-12 w-64 h-64 rounded-full bg-indigo-500 blur-3xl"></div>
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 font-bold text-2xl tracking-tight mb-8">
            <div className="w-10 h-10 rounded-lg bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground shadow-lg">
              A
            </div>
            <span>AgencyFlow</span>
          </div>
          <h1 className="text-4xl font-serif font-medium leading-tight mt-24 mb-6">
            The command center for<br/>creative agencies.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Manage clients, track projects, and orchestrate your studio's operations from one precise interface.
          </p>
        </div>
        
        <div className="relative z-10 text-sm text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} AgencyFlow AI. All rights reserved.
        </div>
      </div>
      
      <div className="flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-background">
        <div className="w-full max-w-sm mx-auto">
          <div className="lg:hidden flex items-center gap-3 font-bold text-2xl tracking-tight mb-12">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
              A
            </div>
            <span>AgencyFlow</span>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Sign In</h2>
            <p className="text-muted-foreground">Enter your details to access your workspace.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="name@agency.com" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <a href="#" className="text-xs font-medium text-primary hover:underline" onClick={(e) => e.preventDefault()}>
                        Forgot password?
                      </a>
                    </div>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 text-base font-medium shadow-sm hover-elevate transition-all"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-primary hover:underline">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
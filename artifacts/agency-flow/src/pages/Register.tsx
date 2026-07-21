import { useState } from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRegister } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
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

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login: authenticate } = useAuth();
  
  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: (data) => {
        authenticate(data.token);
        toast.success('Account created successfully!');
        setLocation('/dashboard');
      },
      onError: (error) => {
        toast.error(error.message || 'Failed to create account. Please try again.');
      },
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    registerMutation.mutate({ data });
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
            Scale your studio<br/>with precision.
          </h1>
          <p className="text-sidebar-foreground/70 text-lg max-w-md">
            Join the platform built specifically for modern creative agencies to manage operations seamlessly.
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
            <h2 className="text-3xl font-bold tracking-tight text-foreground mb-2">Create Account</h2>
            <p className="text-muted-foreground">Set up your workspace to get started.</p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Create a strong password" {...field} className="h-11" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full h-11 mt-2 text-base font-medium shadow-sm hover-elevate transition-all"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </Form>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
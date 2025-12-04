'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import axios from 'axios';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});
type Form = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setLoading(true);
    try {
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, data, { withCredentials: true });
      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Input
              type="email"
              placeholder="Email"
              autoComplete="email"
              {...register('email')}
              className="rounded-xl"
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <Input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              {...register('password')}
              className="rounded-xl"
            />
            {errors.password && <p className="text-xs text-destructive mt-1">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-indigo-500/40 transition-all"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Don’t have an account?{' '}
          <a href="/register" className="underline hover:text-primary">
            Create one
          </a>
        </p>
      </div>
    </main>
  );
}
'use client';
import { ReactNode } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AuthCard({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="absolute inset-0 -z-10 bg-[url('/grid.svg')] opacity-20 dark:opacity-10" />
      <Card className="w-full max-w-md border-0 shadow-2xl backdrop-blur-md bg-white/70 dark:bg-slate-800/70 rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">{title}</CardTitle>
          <CardDescription className="text-center">{desc}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </main>
  );
}
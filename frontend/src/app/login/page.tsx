'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin } from '@react-oauth/google';
import { Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const { user, loading, signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/slideshows';

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push(from);
    }
  }, [user, loading, router, from]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary">
            <Sparkles className="size-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">Welcome to ShortsBro</CardTitle>
          <CardDescription>Sign in to create viral short-form content with AI</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <GoogleLogin
            onSuccess={signIn}
            onError={() => {
              console.error('Google Login Failed');
            }}
            theme="outline"
            size="large"
            text="signin_with"
            shape="rectangular"
          />
        </CardContent>
      </Card>
    </div>
  );
}

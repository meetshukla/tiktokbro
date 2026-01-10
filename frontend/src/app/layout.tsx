import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SlideshowProvider } from '@/context/SlideshowContext';
import { Toaster } from '@/components/ui/sonner';
import { AppShell } from '@/components/layout/AppShell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'ShortsBro - Creator Studio',
  description: 'Generate viral content with AI',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>
          <SlideshowProvider>
            <AppShell>{children}</AppShell>
            <Toaster />
          </SlideshowProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
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
        <SlideshowProvider>
          <AppShell>{children}</AppShell>
          <Toaster />
        </SlideshowProvider>
      </body>
    </html>
  );
}

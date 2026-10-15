import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'CrisisLink Network',
    template: '%s | CrisisLink Network',
  },
  description: 'Real-time disaster management and transparent donation tracking for Bangladesh.',
};

import { AuthProvider } from '@/context/AuthContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full bg-surface-muted text-ink">
        <AuthProvider>{children}</AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: '0.5rem',
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: '0.875rem',
            },
            success: { iconTheme: { primary: '#22C55E', secondary: '#0F172A' } },
            error: { iconTheme: { primary: '#EF4444', secondary: '#0F172A' } },
          }}
        />
      </body>
    </html>
  );
}

import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PublicShell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A] selection:bg-cyan-500 selection:text-white">
      <Navbar />
      <main className={`flex-1 ${className}`}>{children}</main>
      <Footer />
    </div>
  );
}

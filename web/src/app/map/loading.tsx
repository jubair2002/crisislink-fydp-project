import React from 'react';
import { Navbar } from '@/components/Navbar';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function MapLoading() {
  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading national disaster map..." />
      </div>
    </div>
  );
}

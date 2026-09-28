import React from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <LoadingSpinner size="lg" text="Loading disaster response platform..." />
    </div>
  );
}

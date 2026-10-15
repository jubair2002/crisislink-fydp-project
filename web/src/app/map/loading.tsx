import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center bg-[#0F172A] text-white">
      <LoadingSpinner size="lg" label="Loading interactive disaster map..." />
    </div>
  );
}

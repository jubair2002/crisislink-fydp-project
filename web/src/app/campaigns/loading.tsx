import React from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center bg-[#F8FAFC]">
      <LoadingSpinner size="lg" label="Loading relief campaigns..." />
    </div>
  );
}

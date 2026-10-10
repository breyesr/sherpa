import React from 'react';

export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded w-1/4"></div>
      <div className="h-64 bg-slate-100 rounded-lg w-full"></div>
    </div>
  );
}

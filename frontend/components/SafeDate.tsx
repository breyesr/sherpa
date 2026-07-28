'use client';

import { useState, useEffect } from 'react';

interface SafeDateProps {
  date: string | Date;
  format?: 'date' | 'time' | 'full';
  options?: Intl.DateTimeFormatOptions;
  className?: string;
}

export default function SafeDate({ date, format = 'date', options, className }: SafeDateProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const d = new Date(date);

  // Initial server render and first client pass: render a stable, locale-independent placeholder
  // or the ISO string, but wrapped to suppress warning if needed.
  // Actually, returning a placeholder until mount is the safest way to avoid mismatch.
  if (!isMounted) {
    return <span className={className} suppressHydrationWarning>...</span>;
  }

  let text = '';
  try {
    if (format === 'date') {
      text = d.toLocaleDateString(undefined, options);
    } else if (format === 'time') {
      text = d.toLocaleTimeString([], options);
    } else {
      text = `${d.toLocaleDateString(undefined, options)} ${d.toLocaleTimeString([], options)}`;
    }
  } catch {
    text = d.toISOString();
  }

  return <span className={className}>{text}</span>;
}

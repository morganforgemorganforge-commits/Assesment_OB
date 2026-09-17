'use client';

import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';

export default function Banner({
  id,
  variant = 'normal',
  message,
  height = '3rem',
  children,
  className = '',
  ...props
}) {
  const [open, setOpen] = useState(true);
  const globalKey = id ? `banner-${id}` : undefined;

  useEffect(() => {
    if (globalKey) setOpen(localStorage.getItem(globalKey) !== 'true');
  }, [globalKey]);

  const onClick = useCallback(() => {
    setOpen(false);
    if (globalKey) localStorage.setItem(globalKey, 'true');
  }, [globalKey]);

  if (!open) return null;

  return (
    <div
      id={id}
      {...props}
      className={`app-banner banner-${variant} ${className}`}
      style={{ minHeight: height }}
    >
      {variant === 'rainbow' && (
        <>
          <div className="rainbow-bg rainbow-bg-1" />
          <div className="rainbow-bg rainbow-bg-2" />
        </>
      )}
      
      <div className="banner-content">
        {message || children}
      </div>

      {id && (
        <button
          type="button"
          aria-label="Close Banner"
          onClick={onClick}
          className="banner-close"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

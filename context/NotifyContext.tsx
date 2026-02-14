'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type NotifyType = 'success' | 'warning' | 'error';

export interface NotifyItem {
  id: string;
  type: NotifyType;
  message: string;
  duration: number;
  createdAt: number;
}

interface NotifyContextValue {
  success: (message: string, options?: { duration?: number }) => void;
  warning: (message: string, options?: { duration?: number }) => void;
  error: (message: string, options?: { duration?: number }) => void;
  dismiss: (id: string) => void;
  items: NotifyItem[];
}

const DEFAULT_DURATION = 5000;

const NotifyContext = createContext<NotifyContextValue | null>(null);

let idCounter = 0;
const nextId = () => `notify-${Date.now()}-${++idCounter}`;

export function NotifyProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotifyItem[]>([]);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timeoutsRef.current.get(id);
    if (t) clearTimeout(t);
    timeoutsRef.current.delete(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const add = useCallback(
    (type: NotifyType, message: string, options?: { duration?: number }) => {
      const duration = options?.duration ?? DEFAULT_DURATION;
      const id = nextId();
      const item: NotifyItem = {
        id,
        type,
        message,
        duration,
        createdAt: Date.now(),
      };
      setItems((prev) => [...prev, item]);

      if (duration > 0) {
        const t = setTimeout(() => dismiss(id), duration);
        timeoutsRef.current.set(id, t);
      }
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, options?: { duration?: number }) => add('success', message, options),
    [add]
  );
  const warning = useCallback(
    (message: string, options?: { duration?: number }) => add('warning', message, options),
    [add]
  );
  const error = useCallback(
    (message: string, options?: { duration?: number }) => add('error', message, options),
    [add]
  );

  const value: NotifyContextValue = {
    success,
    warning,
    error,
    dismiss,
    items,
  };

  return (
    <NotifyContext.Provider value={value}>
      {children}
      <NotifyToasts />
    </NotifyContext.Provider>
  );
}

function NotifyToasts() {
  const context = useContext(NotifyContext);
  if (!context) return null;
  const { items, dismiss } = context;

  if (items.length === 0) return null;

  return (
    <div
      className="notify-container"
      role="region"
      aria-label="Notifications"
    >
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={() => dismiss(item.id)} />
      ))}
    </div>
  );
}

const typeStyles: Record<NotifyType, { bg: string; border: string; icon: string }> = {
  success: {
    bg: 'var(--notify-success-bg, #d1fae5)',
    border: 'var(--notify-success-border, #059669)',
    icon: '✓',
  },
  warning: {
    bg: 'var(--notify-warning-bg, #fef3c7)',
    border: 'var(--notify-warning-border, #d97706)',
    icon: '!',
  },
  error: {
    bg: 'var(--notify-error-bg, #fee2e2)',
    border: 'var(--notify-error-border, #dc2626)',
    icon: '✕',
  },
};

function Toast({ item, onDismiss }: { item: NotifyItem; onDismiss: () => void }) {
  const style = typeStyles[item.type];
  return (
    <div
      className="notify-toast"
      style={{
        ['--notify-bg' as string]: style.bg,
        ['--notify-border' as string]: style.border,
      }}
      role="alert"
    >
      <span className="notify-toast-icon" aria-hidden>
        {style.icon}
      </span>
      <span className="notify-toast-message">{item.message}</span>
      <button
        type="button"
        className="notify-toast-dismiss"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        ×
      </button>
    </div>
  );
}

export function useNotify(): NotifyContextValue {
  const context = useContext(NotifyContext);
  if (!context) {
    throw new Error('useNotify must be used within a NotifyProvider');
  }
  return context;
}

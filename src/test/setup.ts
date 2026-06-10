import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

afterEach(cleanup);

// Node 26 exposes an experimental globalThis.localStorage getter that returns
// undefined (requires --localstorage-file). This shadows jsdom's localStorage
// and breaks zustand/persist in tests. Replace it with a minimal in-memory stub
// so store tests work without the Node flag.
if (typeof localStorage === 'undefined') {
  const store: Record<string, string> = {};
  const stub: Storage = {
    length: 0,
    clear() {
      for (const k of Object.keys(store)) delete store[k];
    },
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    key(index) {
      return Object.keys(store)[index] ?? null;
    },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: stub, writable: true });
}

// jsdom has no matchMedia; framer-motion's useReducedMotion needs it.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// jsdom has no <dialog> methods (jsdom/jsdom#3294); SourceExplainer uses showModal.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.open = true;
  };
}
if (!HTMLDialogElement.prototype.close) {
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement, returnValue?: string) {
    if (returnValue !== undefined) this.returnValue = returnValue;
    this.open = false;
    // Spec queues the close event; sync dispatch hides StrictMode double-effect bugs.
    queueMicrotask(() => this.dispatchEvent(new Event('close')));
  };
}

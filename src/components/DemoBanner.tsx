import { useState } from 'react';
import { store } from '../lib/store';
import { AlertTriangle, X, Refresh } from './icons';

export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="bg-warn-500/10 border-b border-warn-500/20">
      <div className="max-w-6xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 text-warn-400 min-w-0">
          <AlertTriangle size={13} className="shrink-0" />
          <span className="truncate">
            <span className="font-semibold">Demo mode</span>
            <span className="hidden sm:inline">
              {' '}— wallet, USDC, contract calls, and the arbitration service are simulated client-side.
            </span>
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => {
              if (confirm('Reset all demo state? This wipes plans, wallets, and disputes.')) {
                store.reset();
              }
            }}
            className="btn-ghost text-xs !text-warn-400 hover:!text-warn-300"
          >
            <Refresh size={12} />
            Reset
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="btn-ghost text-xs !text-warn-400 hover:!text-warn-300 !p-1.5"
            aria-label="Dismiss"
          >
            <X size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

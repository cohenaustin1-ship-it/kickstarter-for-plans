import type { Wallet, UserAccount } from '../lib/types';
import { store } from '../lib/store';
import { shortAddr, fmtUSDC } from '../lib/format';
import { ReputationBadge } from './ReputationBadge';
import { Diamond, Wallet as WalletIcon } from './icons';

export type ViewName = 'browse' | 'create' | 'detail' | 'my-events' | 'arbitration';

interface Props {
  wallet: Wallet | null;
  account: UserAccount | null;
  view: ViewName;
  onNav: (v: 'browse' | 'create' | 'my-events') => void;
}

export function Header({ wallet, account, view, onNav }: Props) {
  return (
    <header className="border-b border-ink-700/60 bg-ink-950/80 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-6">
        <button
          onClick={() => onNav('browse')}
          className="flex items-center gap-2.5 group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-signal-400 to-signal-600 flex items-center justify-center shrink-0">
            <Diamond size={16} className="text-ink-950" />
          </div>
          <div className="hidden sm:block text-left leading-tight">
            <div className="font-display font-bold text-white text-sm">
              Kickstarter for Plans
            </div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              Base Sepolia · Demo
            </div>
          </div>
        </button>

        <nav className="flex items-center gap-1 ml-auto sm:ml-4">
          <NavBtn label="Browse" active={view === 'browse'} onClick={() => onNav('browse')} />
          <NavBtn label="Create" active={view === 'create'} onClick={() => onNav('create')} />
          <NavBtn
            label="My Events"
            active={view === 'my-events'}
            onClick={() => onNav('my-events')}
          />
        </nav>

        <div className="ml-auto">
          {wallet ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:block text-right">
                <div className="text-xs text-slate-500">USDC Balance</div>
                <div className="font-mono text-sm text-signal-400 font-semibold">
                  ${fmtUSDC(wallet.usdcBalance)}
                </div>
              </div>
              <ReputationBadge account={account} size="sm" />
              <button
                onClick={() => {
                  if (confirm('Disconnect demo wallet?')) store.disconnect();
                }}
                className="card flex items-center gap-2 px-3 py-2 text-xs hover:border-signal-500/40 transition-colors"
                title="Click to disconnect"
              >
                <span className="w-2 h-2 rounded-full bg-signal-500 pulse-dot" />
                <span className="font-mono">{shortAddr(wallet.address)}</span>
              </button>
            </div>
          ) : (
            <button onClick={() => store.connect()} className="btn-primary">
              <WalletIcon size={14} />
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

function NavBtn({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`btn-ghost text-sm ${active ? '!text-signal-400 !bg-ink-800' : ''}`}
    >
      {label}
    </button>
  );
}

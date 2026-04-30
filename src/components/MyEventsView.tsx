import { useMemo, useState } from 'react';
import type { Plan, Wallet, UserAccount } from '../lib/types';
import { store } from '../lib/store';
import { PlanCard } from './PlanCard';
import { ReputationBadge } from './ReputationBadge';
import { fmtUSDC, shortAddr } from '../lib/format';
import { Briefcase, Users, AlertTriangle, Lock } from './icons';

interface Props {
  wallet: Wallet | null;
  account: UserAccount | null;
  plans: Plan[];
  disputeCounts: { open: number; resolved: number };
  onSelect: (id: number) => void;
  onCreate: () => void;
}

type Tab = 'organizing' | 'committed';

export function MyEventsView({
  wallet,
  account,
  plans,
  disputeCounts,
  onSelect,
  onCreate,
}: Props) {
  const [tab, setTab] = useState<Tab>('organizing');

  const { organizing, committed } = useMemo(() => {
    if (!wallet) return { organizing: [], committed: [] };
    const organizing = plans.filter((p) => p.organizer === wallet.address);
    const committed = plans.filter(
      (p) => p.organizer !== wallet.address && p.committers.includes(wallet.address)
    );
    return { organizing, committed };
  }, [plans, wallet]);

  if (!wallet) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="card p-10">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">
            Connect a wallet to see your events
          </h2>
          <p className="text-slate-400 mb-6">
            Once connected, this page lists every plan you've organized or committed to,
            tracks your reputation, and routes any open disputes to your inbox.
          </p>
          <button onClick={() => store.connect()} className="btn-primary">
            Connect Demo Wallet
          </button>
        </div>
      </div>
    );
  }

  const list = tab === 'organizing' ? organizing : committed;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Profile header */}
      <section className="card p-6 md:p-8 mb-8">
        {account?.isFrozen && (
          <div className="mb-5 rounded-lg border border-danger-500/40 bg-danger-500/10 px-4 py-3 flex items-start gap-3">
            <Lock size={18} className="text-danger-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-danger-400 mb-1">Account frozen</div>
              <div className="text-slate-300">
                {account.frozenReason ?? 'Frozen by arbitration order.'} You cannot
                organize new plans or commit to existing ones until reinstated.
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
              Your Account
            </div>
            <div className="font-mono text-white text-lg mb-3">
              {shortAddr(wallet.address, 10, 8)}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <ReputationBadge account={account} size="md" />
              <span className="badge bg-ink-700 text-slate-300 font-mono">
                ${fmtUSDC(wallet.usdcBalance)} USDC
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-3">
            <Stat label="Organized" value={String(account?.organizedCount ?? 0)} />
            <Stat label="Committed" value={String(account?.committedCount ?? 0)} />
            <Stat
              label="Disputes won"
              value={String(account?.disputesWon ?? 0)}
              tone={account && account.disputesWon > 0 ? 'good' : undefined}
            />
            <Stat
              label="Disputes lost"
              value={String(account?.disputesLost ?? 0)}
              tone={account && account.disputesLost > 0 ? 'bad' : undefined}
            />
          </div>
        </div>

        {(disputeCounts.open > 0 || disputeCounts.resolved > 0) && (
          <div className="mt-6 pt-5 border-t border-ink-700/60 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <AlertTriangle size={14} className="text-warn-400" />
            <span>
              <span className="text-warn-400 font-semibold">{disputeCounts.open}</span> open dispute(s)
              {' · '}
              <span className="text-slate-300 font-semibold">{disputeCounts.resolved}</span> resolved
            </span>
          </div>
        )}
      </section>

      {/* Tabs */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-1 card p-1 w-fit">
          <TabButton
            active={tab === 'organizing'}
            onClick={() => setTab('organizing')}
            icon={<Briefcase size={14} />}
            label="Organizing"
            count={organizing.length}
          />
          <TabButton
            active={tab === 'committed'}
            onClick={() => setTab('committed')}
            icon={<Users size={14} />}
            label="Committed"
            count={committed.length}
          />
        </div>
        <button
          onClick={onCreate}
          disabled={account?.isFrozen}
          className="btn-primary"
        >
          New Plan
        </button>
      </div>

      {list.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-slate-400 mb-4">
            {tab === 'organizing'
              ? "You haven't organized any plans yet."
              : "You haven't committed to any plans yet."}
          </div>
          {tab === 'organizing' ? (
            <button
              onClick={onCreate}
              disabled={account?.isFrozen}
              className="btn-primary"
            >
              Create your first plan
            </button>
          ) : (
            <button onClick={() => onSelect(-1)} className="btn-secondary" style={{ display: 'none' }}>
              Browse plans
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {list.map((p) => (
            <PlanCard key={p.id} plan={p} onClick={() => onSelect(p.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-ink-700 text-white'
          : 'text-slate-400 hover:text-white hover:bg-ink-800'
      }`}
    >
      {icon}
      {label}
      <span
        className={`text-xs font-mono ${
          active ? 'text-signal-400' : 'text-slate-500'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'good' | 'bad' }) {
  const toneClass =
    tone === 'good'
      ? 'text-signal-400'
      : tone === 'bad'
      ? 'text-danger-400'
      : 'text-white';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
        {label}
      </div>
      <div className={`text-xl font-semibold font-mono ${toneClass}`}>{value}</div>
    </div>
  );
}

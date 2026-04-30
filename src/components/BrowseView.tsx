import { useMemo } from 'react';
import type { AppState, Plan } from '../lib/types';
import { PlanCard } from './PlanCard';
import { Plus } from './icons';

interface Props {
  plans: Plan[];
  accounts: AppState['accounts'];
  disputes: AppState['disputes'];
  onSelect: (id: number) => void;
  onCreate: () => void;
}

export function BrowseView({ plans, accounts, disputes, onSelect, onCreate }: Props) {
  const { active, history } = useMemo(() => {
    const active = plans.filter(
      (p) => p.state === 'Pending' && p.deadline > Date.now()
    );
    const history = plans.filter(
      (p) => p.state !== 'Pending' || p.deadline <= Date.now()
    );
    return { active, history };
  }, [plans]);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <section className="mb-12">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-signal-400 font-semibold mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-signal-500" />
          On-chain group commitment
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-white tracking-tight mb-4 max-w-3xl">
          Lock USDC. Hit the threshold.
          <span className="text-signal-400"> Or get refunded.</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl">
          Organizers set a cost, attendee threshold, and deadline. USDC sits in the contract until
          the threshold is hit — then it pays out, or refunds, automatically. Disputes route to an
          external arbitration team.
        </p>
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <h2 className="font-display text-2xl font-semibold text-white">Active Plans</h2>
            <p className="text-sm text-slate-500 mt-1">
              {active.length} {active.length === 1 ? 'plan' : 'plans'} accepting commits
            </p>
          </div>
          <button onClick={onCreate} className="btn-primary">
            <Plus size={14} />
            New Plan
          </button>
        </div>

        {active.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-slate-400 mb-4">No active plans right now.</div>
            <button onClick={onCreate} className="btn-primary">
              <Plus size={14} />
              Create the first one
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onClick={() => onSelect(p.id)}
                accounts={accounts}
                disputes={disputes}
              />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-xl font-semibold text-white mb-1">
            Past &amp; Awaiting Finalize
          </h2>
          <p className="text-sm text-slate-500 mb-5">
            Deadline reached. Anyone can call{' '}
            <code className="font-mono text-signal-400">finalize()</code>.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                onClick={() => onSelect(p.id)}
                accounts={accounts}
                disputes={disputes}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

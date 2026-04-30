import type { Plan, AppState } from '../lib/types';
import { fmtUSDC, timeLeft } from '../lib/format';
import { Check, X, Clock, ShieldAlert, Lock } from './icons';

interface Props {
  plan: Plan;
  onClick: () => void;
  accounts?: AppState['accounts'];
  disputes?: AppState['disputes'];
}

export function PlanCard({ plan, onClick, accounts, disputes }: Props) {
  const pct = Math.min(100, (plan.committers.length / plan.threshold) * 100);
  const remaining = timeLeft(plan.deadline);
  const expired = remaining === 'Expired';

  const orgFrozen = accounts?.[plan.organizer]?.isFrozen ?? false;
  const openDisputes = disputes
    ? plan.disputeIds
        .map((id) => disputes[id])
        .filter(
          (d) =>
            d &&
            (d.status === 'voting' ||
              d.status === 'awaiting_submission' ||
              d.status === 'under_review')
        )
    : [];

  return (
    <button
      onClick={onClick}
      className="card card-hover text-left p-5 w-full group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-display font-semibold text-lg text-white group-hover:text-signal-400 transition-colors truncate">
            {plan.title}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
            {plan.state === 'Pending' && !expired && (
              <span className="badge-pending">
                <span className="w-1.5 h-1.5 rounded-full bg-warn-400 pulse-dot" />
                Pending
              </span>
            )}
            {plan.state === 'Pending' && expired && (
              <span className="badge bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30">
                <Clock size={11} />
                Awaiting finalize
              </span>
            )}
            {plan.state === 'Confirmed' && (
              <span className="badge-confirmed">
                <Check size={11} /> Confirmed
              </span>
            )}
            {plan.state === 'Failed' && (
              <span className="badge-failed">
                <X size={11} /> Failed
              </span>
            )}
            {orgFrozen && (
              <span className="badge bg-danger-500/15 text-danger-400 ring-1 ring-danger-500/30">
                <Lock size={11} /> Organizer frozen
              </span>
            )}
            {openDisputes.length > 0 && (
              <span className="badge bg-warn-500/15 text-warn-400 ring-1 ring-warn-500/30">
                <ShieldAlert size={11} /> {openDisputes.length} dispute{openDisputes.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-signal-400 font-semibold">
            ${fmtUSDC(plan.costPerHead)}
          </div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">
            USDC / head
          </div>
        </div>
      </div>

      <p className="text-sm text-slate-400 line-clamp-2 mb-4">{plan.description}</p>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">
            <span className="text-white font-semibold">{plan.committers.length}</span>
            {' / '}
            {plan.threshold} committed
          </span>
          <span
            className={`font-mono ${
              expired ? 'text-danger-400' : 'text-slate-300'
            }`}
          >
            {expired ? 'Expired' : remaining + ' left'}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-signal-600 to-signal-400 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </button>
  );
}

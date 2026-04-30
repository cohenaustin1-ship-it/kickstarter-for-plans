import { useState } from 'react';
import type { AppState, Plan, Wallet } from '../lib/types';
import { store } from '../lib/store';
import { fmtUSDC, shortAddr, timeLeft } from '../lib/format';
import { DisputeSection } from './DisputeSection';
import { ReputationBadge } from './ReputationBadge';
import {
  ArrowLeft,
  Check,
  X,
  Loader,
  FastForward,
  Sparkles,
  Lock,
  Users,
  Calendar,
  DollarSign,
  ShieldCheck,
  Clock,
} from './icons';

interface Props {
  plan: Plan;
  wallet: Wallet | null;
  state: AppState;
  onBack: () => void;
  onOpenArbitration: (disputeId: string) => void;
}

export function PlanDetailView({
  plan,
  wallet,
  state,
  onBack,
  onOpenArbitration,
}: Props) {
  const me = wallet?.address ?? null;
  const isOrganizer = me === plan.organizer;
  const isCommitter = me ? plan.committers.includes(me) : false;
  const expired = plan.deadline <= Date.now();
  const pct = Math.min(100, (plan.committers.length / plan.threshold) * 100);

  const organizerAccount = state.accounts[plan.organizer] ?? null;
  const disputes = plan.disputeIds
    .map((id) => state.disputes[id])
    .filter(Boolean);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wrap = async (label: string, fn: () => void | Promise<void>, delayMs = 600) => {
    setError(null);
    setBusy(label);
    try {
      await new Promise((r) => setTimeout(r, delayMs));
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  const handleCommit = async () => {
    if (!wallet) return;
    setError(null);
    setBusy('approve');
    try {
      await new Promise((r) => setTimeout(r, 700));
      store.approve(plan.costPerHead);
      setBusy('commit');
      await new Promise((r) => setTimeout(r, 700));
      store.commit(plan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Commit failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <button onClick={onBack} className="btn-ghost text-sm mb-4 -ml-2">
        <ArrowLeft size={14} /> All plans
      </button>

      {/* Header */}
      <div className="card p-6 md:p-8 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {plan.state === 'Pending' && !expired && (
                <span className="badge-pending">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn-400 pulse-dot" />
                  Pending
                </span>
              )}
              {plan.state === 'Pending' && expired && (
                <span className="badge bg-slate-500/15 text-slate-400 ring-1 ring-slate-500/30">
                  <Clock size={11} /> Awaiting finalize
                </span>
              )}
              {plan.state === 'Confirmed' && (
                <span className="badge-confirmed">
                  <Check size={12} /> Confirmed
                </span>
              )}
              {plan.state === 'Failed' && (
                <span className="badge-failed">
                  <X size={12} /> Failed
                </span>
              )}
              <span className="text-xs text-slate-500 font-mono">#{plan.id}</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-white tracking-tight">
              {plan.title}
            </h1>
          </div>
          <div className="text-right">
            <div className="font-mono text-2xl text-signal-400 font-bold">
              ${fmtUSDC(plan.costPerHead)}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">USDC / head</div>
          </div>
        </div>

        <p className="text-slate-300 mb-5 leading-relaxed">{plan.description}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-ink-700/60">
          <Stat
            icon={<Users size={12} />}
            label="Committers"
            value={`${plan.committers.length} / ${plan.threshold}`}
          />
          <Stat
            icon={<DollarSign size={12} />}
            label="Pool size"
            value={`$${fmtUSDC(plan.costPerHead * plan.committers.length)}`}
          />
          <Stat
            icon={<Calendar size={12} />}
            label="Deadline"
            value={timeLeft(plan.deadline) === 'Expired' ? 'Expired' : timeLeft(plan.deadline)}
          />
          <Stat
            icon={<ShieldCheck size={12} />}
            label="Organizer"
            value={shortAddr(plan.organizer)}
            sub={isOrganizer ? 'you' : undefined}
            extra={<ReputationBadge account={organizerAccount} size="sm" />}
          />
        </div>

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">Threshold progress</span>
            <span className="text-slate-300 font-mono">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-ink-700 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-signal-600 to-signal-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Frozen organizer warning */}
        {organizerAccount?.isFrozen && (
          <div className="mt-5 rounded-lg border border-danger-500/40 bg-danger-500/10 px-4 py-3 flex items-start gap-3">
            <Lock size={16} className="text-danger-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-semibold text-danger-400 mb-0.5">Organizer frozen</div>
              <div className="text-slate-300 text-xs">
                {organizerAccount.frozenReason ??
                  'This organizer has been frozen by KFP Arbitration. Refunds have been disbursed to committers.'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action card */}
      <div className="card p-6 md:p-8 mb-6">
        <h2 className="font-display text-lg font-semibold text-white mb-4">Your actions</h2>

        {!wallet ? (
          <div className="text-sm text-slate-400">
            Connect a wallet to commit, finalize, or claim.
          </div>
        ) : (
          <ActionPanel
            plan={plan}
            wallet={wallet}
            isOrganizer={isOrganizer}
            isCommitter={isCommitter}
            expired={expired}
            busy={busy}
            error={error}
            onCommit={handleCommit}
            onFinalize={() => wrap('finalize', () => store.finalize(plan.id))}
            onClaim={() => wrap('claim', () => store.claim(plan.id))}
          />
        )}

        {/* Demo affordances */}
        {plan.state === 'Pending' && !expired && (
          <div className="mt-5 pt-5 border-t border-ink-700/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-slate-500">
              Demo: skip ahead to test finalize / claim flows
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => store.simulateCommits(plan.id)}
                className="btn-ghost text-xs"
              >
                <Sparkles size={12} />
                Fill to threshold
              </button>
              <button
                onClick={() => store.expirePlan(plan.id)}
                className="btn-ghost text-xs"
              >
                <FastForward size={12} />
                Skip to deadline
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dispute section */}
      <DisputeSection
        plan={plan}
        disputes={disputes}
        wallet={wallet}
        onOpenArbitration={onOpenArbitration}
      />

      {/* Committers list */}
      {plan.committers.length > 0 && (
        <div className="card p-6 md:p-8 mt-6">
          <h2 className="font-display text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Users size={16} />
            Committers ({plan.committers.length})
          </h2>
          <div className="space-y-2">
            {plan.committers.map((addr) => {
              const acct = state.accounts[addr];
              const claimed = plan.hasClaimed[addr];
              return (
                <div
                  key={addr}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-ink-900/40"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-sm text-slate-200 truncate">
                      {shortAddr(addr, 8, 6)}
                    </span>
                    {addr === me && (
                      <span className="badge bg-signal-500/10 text-signal-400 ring-1 ring-signal-500/20">
                        you
                      </span>
                    )}
                    <ReputationBadge account={acct ?? null} size="sm" />
                  </div>
                  {claimed && (
                    <span className="badge bg-signal-500/10 text-signal-400 ring-1 ring-signal-500/20 text-xs">
                      <Check size={10} /> claimed
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// --- Action panel --------------------------------------------------------

function ActionPanel({
  plan,
  wallet,
  isOrganizer,
  isCommitter,
  expired,
  busy,
  error,
  onCommit,
  onFinalize,
  onClaim,
}: {
  plan: Plan;
  wallet: Wallet;
  isOrganizer: boolean;
  isCommitter: boolean;
  expired: boolean;
  busy: string | null;
  error: string | null;
  onCommit: () => void;
  onFinalize: () => void;
  onClaim: () => void;
}) {
  // Pending, before deadline
  if (plan.state === 'Pending' && !expired) {
    if (isCommitter) {
      return (
        <Notice tone="good">
          <Check size={14} />
          You committed ${fmtUSDC(plan.costPerHead)} USDC. If the threshold isn't met by
          deadline, you can refund.
        </Notice>
      );
    }
    if (isOrganizer) {
      return (
        <Notice>
          You're the organizer. Once threshold is hit and the deadline passes, you can
          claim the pool. Committers can dispute non-delivery within 7 days of deadline.
        </Notice>
      );
    }
    if (wallet.usdcBalance < plan.costPerHead) {
      return (
        <Notice tone="warn">
          You need ${fmtUSDC(plan.costPerHead)} USDC to commit. Wallet has $
          {fmtUSDC(wallet.usdcBalance)}.
        </Notice>
      );
    }
    return (
      <div>
        <button
          onClick={onCommit}
          disabled={busy !== null}
          className="btn-primary w-full sm:w-auto"
        >
          {busy === 'approve' ? (
            <>
              <Loader size={14} /> Approving USDC… 1/2
            </>
          ) : busy === 'commit' ? (
            <>
              <Loader size={14} /> Committing… 2/2
            </>
          ) : (
            <>Commit ${fmtUSDC(plan.costPerHead)} USDC</>
          )}
        </button>
        <p className="text-xs text-slate-500 mt-2">
          Two-step: approve USDC, then commit. USDC stays escrowed in the contract until the
          plan finalizes.
        </p>
        {error && (
          <div className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Pending, expired - awaiting finalize
  if (plan.state === 'Pending' && expired) {
    return (
      <div>
        <p className="text-sm text-slate-300 mb-3">
          Deadline reached. Anyone can finalize this plan.
          {plan.committers.length >= plan.threshold ? (
            <span className="text-signal-400 ml-1">
              Threshold met — will resolve to Confirmed.
            </span>
          ) : (
            <span className="text-warn-400 ml-1">
              Threshold not met — will resolve to Failed (refunds available).
            </span>
          )}
        </p>
        <button
          onClick={onFinalize}
          disabled={busy !== null}
          className="btn-primary"
        >
          {busy === 'finalize' ? (
            <>
              <Loader size={14} /> Finalizing…
            </>
          ) : (
            <>Finalize Plan</>
          )}
        </button>
        {error && (
          <div className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Confirmed
  if (plan.state === 'Confirmed') {
    if (isOrganizer) {
      const claimed = plan.hasClaimed[wallet.address];
      const total = plan.costPerHead * plan.committers.length;
      if (claimed) {
        return (
          <Notice tone="good">
            <Check size={14} />
            You claimed ${fmtUSDC(total)} USDC. The dispute window is open for{' '}
            {timeLeft(plan.disputeWindowEnds)} — committers can challenge non-delivery.
          </Notice>
        );
      }
      return (
        <div>
          <p className="text-sm text-slate-300 mb-3">
            Plan confirmed. As organizer, you can now claim the pool.
          </p>
          <button onClick={onClaim} disabled={busy !== null} className="btn-primary">
            {busy === 'claim' ? (
              <>
                <Loader size={14} /> Claiming…
              </>
            ) : (
              <>Claim ${fmtUSDC(total)} USDC</>
            )}
          </button>
          {error && (
            <div className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
              {error}
            </div>
          )}
        </div>
      );
    }
    if (isCommitter) {
      return (
        <Notice tone="good">
          <Sparkles size={14} />
          Plan confirmed. Your commit became part of the pool the organizer claimed. If they
          fail to deliver, file a dispute below within{' '}
          {timeLeft(plan.disputeWindowEnds)}.
        </Notice>
      );
    }
    return <Notice>This plan is confirmed.</Notice>;
  }

  // Failed
  if (plan.state === 'Failed') {
    if (isCommitter) {
      const claimed = plan.hasClaimed[wallet.address];
      if (claimed) {
        return (
          <Notice tone="good">
            <Check size={14} /> Refund claimed.
          </Notice>
        );
      }
      return (
        <div>
          <p className="text-sm text-slate-300 mb-3">
            Threshold wasn't met. You can refund your commit.
          </p>
          <button onClick={onClaim} disabled={busy !== null} className="btn-primary">
            {busy === 'claim' ? (
              <>
                <Loader size={14} /> Refunding…
              </>
            ) : (
              <>Refund ${fmtUSDC(plan.costPerHead)} USDC</>
            )}
          </button>
          {error && (
            <div className="mt-3 rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
              {error}
            </div>
          )}
        </div>
      );
    }
    return <Notice>Plan failed — refunds available to committers.</Notice>;
  }

  return null;
}

// --- Helpers -------------------------------------------------------------

function Notice({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn';
}) {
  const cls =
    tone === 'good'
      ? 'border-signal-500/30 bg-signal-500/5 text-slate-200'
      : tone === 'warn'
      ? 'border-warn-500/30 bg-warn-500/5 text-slate-200'
      : 'border-ink-700/60 bg-ink-900/40 text-slate-300';
  return (
    <div
      className={`rounded-lg border ${cls} px-4 py-3 text-sm flex items-start gap-2`}
    >
      {children}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1 flex items-center gap-1">
        {icon}
        {label}
      </div>
      <div className="text-white font-mono text-sm flex items-center gap-1.5 flex-wrap">
        {value}
        {sub && <span className="text-signal-400 text-xs">({sub})</span>}
        {extra}
      </div>
    </div>
  );
}

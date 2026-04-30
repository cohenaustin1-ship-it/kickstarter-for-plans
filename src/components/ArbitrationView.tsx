import { useEffect, useState } from 'react';
import type { Dispute, Plan, Wallet } from '../lib/types';
import { store, voteSummary } from '../lib/store';
import {
  Gavel,
  ArrowLeft,
  Hash,
  Clock,
  CheckCircle,
  XCircle,
  ShieldAlert,
  ExternalLink,
  Loader,
  FileSearch,
  User,
  Sparkles,
} from './icons';
import { fmtRelative, fmtUSDC, shortAddr } from '../lib/format';

interface Props {
  disputeId: string;
  dispute: Dispute | null;
  plan: Plan | null;
  wallet: Wallet | null;
  onBack: () => void;
}

// Simulated review window in ms. After this elapses we auto-resolve.
const REVIEW_DURATION_MS = 12_000;

export function ArbitrationView({ disputeId, dispute, plan, wallet, onBack }: Props) {
  // Auto-resolve simulated review after duration
  const [autoResolveAt, setAutoResolveAt] = useState<number | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!dispute || dispute.status !== 'under_review' || !dispute.arbitrationSubmittedAt) {
      setAutoResolveAt(null);
      return;
    }
    const target = dispute.arbitrationSubmittedAt + REVIEW_DURATION_MS;
    setAutoResolveAt(target);
    const interval = setInterval(() => force((n) => n + 1), 500);
    const timeout = setTimeout(() => {
      // Auto-resolve based on vote weight
      try {
        store.resolveArbitration(disputeId);
      } catch {
        /* may already be resolved */
      }
    }, Math.max(0, target - Date.now()));
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [dispute, disputeId]);

  if (!dispute || !plan) {
    return (
      <ArbitrationShell onBack={onBack}>
        <div className="text-center py-16">
          <div className="text-slate-400 mb-3">Case not found.</div>
          <button onClick={onBack} className="btn-secondary">
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </ArbitrationShell>
    );
  }

  const summary = voteSummary(dispute, plan.committers.length);
  const reviewProgress = autoResolveAt
    ? Math.min(
        100,
        Math.max(
          0,
          ((Date.now() - (dispute.arbitrationSubmittedAt ?? Date.now())) /
            REVIEW_DURATION_MS) *
            100
        )
      )
    : dispute.status === 'upheld' || dispute.status === 'rejected'
    ? 100
    : 0;

  const me = wallet?.address ?? null;

  return (
    <ArbitrationShell onBack={onBack}>
      {/* Case header */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 md:p-8 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs uppercase tracking-widest text-amber-300 font-semibold">
              <Hash size={12} />
              Case file
            </div>
            <div className="font-mono text-2xl text-white font-semibold mb-1">
              {dispute.caseId ?? '—'}
            </div>
            <div className="text-sm text-slate-300">
              Plan #{plan.id} — {plan.title}
            </div>
          </div>
          <StatusBadge status={dispute.status} />
        </div>

        {/* Review progress / outcome */}
        {dispute.status === 'under_review' && (
          <div className="rounded-lg bg-ink-950/70 border border-amber-500/20 p-4 mb-5">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-amber-300">
                <Loader size={14} />
                <span className="font-semibold">Under review by KFP Arbitration</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {Math.floor(reviewProgress)}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
                style={{ width: `${reviewProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
              <span>
                Reviewer: <span className="text-white">{dispute.arbitrator ?? '—'}</span>
              </span>
              <span className="font-mono">
                <Clock size={11} className="inline -mt-0.5 mr-1" />
                ~{Math.max(0, Math.ceil((REVIEW_DURATION_MS / 1000) * (1 - reviewProgress / 100)))}s
              </span>
            </div>
            {/* Demo affordance */}
            <div className="mt-3 pt-3 border-t border-ink-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-500">Demo: skip the wait</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => store.resolveArbitration(disputeId, 'uphold')}
                  className="btn-ghost text-xs"
                >
                  <Sparkles size={12} />
                  Force uphold
                </button>
                <button
                  onClick={() => store.resolveArbitration(disputeId, 'reject')}
                  className="btn-ghost text-xs"
                >
                  <Sparkles size={12} />
                  Force reject
                </button>
              </div>
            </div>
          </div>
        )}

        {(dispute.status === 'upheld' || dispute.status === 'rejected') && (
          <VerdictPanel dispute={dispute} plan={plan} />
        )}

        {/* Evidence + parties */}
        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <Section title="Filed by">
            <Party addr={dispute.filedBy} you={dispute.filedBy === me} role="Complainant" />
            <div className="mt-3 text-sm text-slate-200">
              <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">Reason</div>
              {dispute.reason}
            </div>
            {dispute.evidence && (
              <div className="mt-3">
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Evidence submitted
                </div>
                <div className="text-sm text-slate-300 italic">{dispute.evidence}</div>
              </div>
            )}
          </Section>

          <Section title="Respondent">
            <Party addr={plan.organizer} you={plan.organizer === me} role="Organizer" />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
                  Pool claimed
                </div>
                <div className="text-white font-mono">
                  $
                  {fmtUSDC(plan.costPerHead * plan.committers.length)} USDC
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-0.5">
                  Committers
                </div>
                <div className="text-white font-mono">{plan.committers.length}</div>
              </div>
            </div>
          </Section>
        </div>

        {/* Vote evidence */}
        <Section title="Committer vote (on-chain evidence)" className="mt-5">
          <div className="grid grid-cols-3 gap-3 text-sm mb-3">
            <Stat label="Support" value={summary.support} tone="good" />
            <Stat label="Oppose" value={summary.oppose} tone="bad" />
            <Stat label="Quorum" value={`${summary.total}/${summary.quorumNeeded}`} />
          </div>
          <div className="h-2 rounded-full bg-ink-700 overflow-hidden flex">
            <div
              className="bg-signal-500"
              style={{
                width: `${(summary.support / Math.max(1, plan.committers.length)) * 100}%`,
              }}
            />
            <div
              className="bg-danger-500"
              style={{
                width: `${(summary.oppose / Math.max(1, plan.committers.length)) * 100}%`,
              }}
            />
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Each vote is signed by the committer's wallet. The arbitration team uses these
            signatures as primary evidence of community sentiment.
          </div>
        </Section>
      </div>

      {/* Audit trail */}
      <Section title="Case timeline" boxed>
        <ol className="space-y-2 text-sm">
          <Timeline
            ts={dispute.filedAt}
            label="Dispute filed"
            detail={`by ${shortAddr(dispute.filedBy)}`}
          />
          {dispute.votes
            .filter((v) => v.voter !== dispute.filedBy)
            .slice(-3)
            .map((v) => (
              <Timeline
                key={v.voter}
                ts={v.votedAt}
                label={`Vote: ${v.support ? 'support' : 'oppose'}`}
                detail={`by ${shortAddr(v.voter)}`}
              />
            ))}
          {dispute.arbitrationSubmittedAt && (
            <Timeline
              ts={dispute.arbitrationSubmittedAt}
              label="Submitted to arbitration"
              detail={`assigned to ${dispute.arbitrator}`}
            />
          )}
          {dispute.arbitrationResolvedAt && (
            <Timeline
              ts={dispute.arbitrationResolvedAt}
              label={`Resolved: ${dispute.status}`}
              detail="verdict issued"
            />
          )}
        </ol>
      </Section>
    </ArbitrationShell>
  );
}

// --- Subcomponents -------------------------------------------------------

function ArbitrationShell({
  children,
  onBack,
}: {
  children: React.ReactNode;
  onBack: () => void;
}) {
  return (
    <div
      className="min-h-[calc(100vh-200px)]"
      // Slightly different ambient lighting to convey "external system"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 70% 50% at 50% -10%, rgba(245, 158, 11, 0.10), transparent 60%)',
      }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* External-system header */}
        <div className="mb-6">
          <button onClick={onBack} className="btn-ghost text-sm mb-4 -ml-2">
            <ArrowLeft size={14} /> Back to plan
          </button>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                <Gavel size={18} className="text-ink-950" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-white">
                  KFP Arbitration Service
                </h1>
                <div className="text-xs text-amber-300/80 flex items-center gap-1.5">
                  <ExternalLink size={11} />
                  External review · operated by NYU Stern Blockchain &amp; Fintech Club
                </div>
              </div>
            </div>
            <div className="text-xs text-slate-500">
              Case data is signed and audited off-chain.
            </div>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const map = {
    voting: { label: 'Voting', cls: 'bg-warn-500/15 text-warn-400 ring-warn-500/30' },
    awaiting_submission: {
      label: 'Awaiting submission',
      cls: 'bg-warn-500/15 text-warn-400 ring-warn-500/30',
    },
    under_review: {
      label: 'Under review',
      cls: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    },
    upheld: {
      label: 'Upheld',
      cls: 'bg-signal-500/15 text-signal-400 ring-signal-500/30',
    },
    rejected: {
      label: 'Rejected',
      cls: 'bg-danger-500/15 text-danger-400 ring-danger-500/30',
    },
    withdrawn: {
      label: 'Withdrawn',
      cls: 'bg-slate-500/15 text-slate-400 ring-slate-500/30',
    },
  } as const;
  const info = map[status];
  return (
    <span
      className={`badge ring-1 ${info.cls} text-sm font-semibold uppercase tracking-wide`}
    >
      {info.label}
    </span>
  );
}

function VerdictPanel({ dispute, plan }: { dispute: Dispute; plan: Plan }) {
  const upheld = dispute.status === 'upheld';
  return (
    <div
      className={`rounded-lg p-5 border ${
        upheld
          ? 'bg-signal-500/10 border-signal-500/30'
          : 'bg-ink-800/50 border-slate-600/40'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        {upheld ? (
          <CheckCircle size={18} className="text-signal-400" />
        ) : (
          <XCircle size={18} className="text-slate-400" />
        )}
        <h3 className="font-display font-semibold text-white">
          Verdict: {upheld ? 'Dispute upheld' : 'Dispute rejected'}
        </h3>
      </div>

      {upheld && (
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <Outcome label="Refunds disbursed" value={`${plan.committers.length}× $${fmtUSDC(plan.costPerHead)}`} icon={CheckCircle} />
          <Outcome label="Organizer status" value="FROZEN" icon={ShieldAlert} tone="bad" />
          <Outcome label="Reputation" value="0 / 100" icon={ShieldAlert} tone="bad" />
        </div>
      )}

      <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-ink-950/40 p-4 rounded border border-ink-700/40">
        {dispute.arbitrationVerdict}
      </pre>
    </div>
  );
}

function Outcome({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof CheckCircle;
  tone?: 'bad';
}) {
  return (
    <div
      className={`rounded-lg p-3 border ${
        tone === 'bad'
          ? 'border-danger-500/30 bg-danger-500/5'
          : 'border-signal-500/30 bg-signal-500/5'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
        <Icon size={11} />
        {label}
      </div>
      <div
        className={`text-sm font-semibold font-mono ${
          tone === 'bad' ? 'text-danger-400' : 'text-signal-400'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  className = '',
  boxed,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  boxed?: boolean;
}) {
  return (
    <div className={className}>
      <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
        <FileSearch size={12} />
        {title}
      </div>
      {boxed ? (
        <div className="rounded-lg border border-ink-700/60 bg-ink-900/40 p-4">{children}</div>
      ) : (
        children
      )}
    </div>
  );
}

function Party({ addr, you, role }: { addr: string; you?: boolean; role: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <User size={14} className="text-slate-400" />
      <span className="font-mono text-slate-200">{shortAddr(addr, 8, 6)}</span>
      {you && (
        <span className="badge bg-signal-500/10 text-signal-400 ring-1 ring-signal-500/20">
          you
        </span>
      )}
      <span className="text-xs text-slate-500">· {role}</span>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: 'good' | 'bad';
}) {
  const cls =
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
      <div className={`text-lg font-semibold font-mono ${cls}`}>{value}</div>
    </div>
  );
}

function Timeline({
  ts,
  label,
  detail,
}: {
  ts: number;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-400 shrink-0" />
      <div className="flex-1 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <span className="text-white font-medium">{label}</span>{' '}
          <span className="text-slate-400 text-xs">— {detail}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">{fmtRelative(ts)}</span>
      </div>
    </li>
  );
}

import { useState } from 'react';
import type { Plan, Wallet, Dispute } from '../lib/types';
import { store, voteSummary, disputeStatusLabel } from '../lib/store';
import {
  Gavel,
  Send,
  ThumbsUp,
  ThumbsDown,
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Loader,
  Hash,
  Sparkles,
} from './icons';
import { fmtRelative, fmtTimeUntil, shortAddr } from '../lib/format';

interface Props {
  plan: Plan;
  disputes: Dispute[];
  wallet: Wallet | null;
  onOpenArbitration: (disputeId: string) => void;
}

export function DisputeSection({ plan, disputes, wallet, onOpenArbitration }: Props) {
  const me = wallet?.address ?? null;
  const isCommitter = me ? plan.committers.includes(me) : false;
  const isOrganizer = me === plan.organizer;

  const open = disputes.filter(
    (d) => d.status === 'voting' || d.status === 'awaiting_submission' || d.status === 'under_review'
  );
  const resolved = disputes.filter(
    (d) => d.status === 'upheld' || d.status === 'rejected' || d.status === 'withdrawn'
  );

  const canFile =
    plan.state === 'Confirmed' &&
    isCommitter &&
    !isOrganizer &&
    Date.now() < plan.disputeWindowEnds &&
    !open.some((d) => d.filedBy === me);

  return (
    <div className="card p-6 md:p-8">
      <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
        <div>
          <h2 className="font-display text-lg font-semibold text-white flex items-center gap-2">
            <ShieldAlert size={18} className="text-warn-400" />
            Disputes &amp; Arbitration
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Committers can dispute non-delivery. Vote then escalate to the KFP Arbitration team.
          </p>
        </div>
        {plan.state === 'Confirmed' && (
          <div className="text-right text-xs">
            <div className="text-slate-500">Dispute window</div>
            <div className="text-slate-300 font-mono">
              {Date.now() < plan.disputeWindowEnds
                ? fmtTimeUntil(plan.disputeWindowEnds) + ' left'
                : 'Closed'}
            </div>
          </div>
        )}
      </div>

      {plan.state !== 'Confirmed' && (
        <div className="text-sm text-slate-500 italic">
          Disputes can only be filed once a plan is Confirmed.
        </div>
      )}

      {plan.state === 'Confirmed' && (
        <>
          {/* Active disputes */}
          {open.length > 0 && (
            <div className="space-y-4 mb-5">
              {open.map((d) => (
                <DisputeCard
                  key={d.id}
                  plan={plan}
                  dispute={d}
                  wallet={wallet}
                  onOpenArbitration={onOpenArbitration}
                />
              ))}
            </div>
          )}

          {/* File new dispute */}
          {canFile && <FileDisputeForm plan={plan} />}

          {!canFile && open.length === 0 && plan.state === 'Confirmed' && (
            <EmptyState
              isCommitter={isCommitter}
              isOrganizer={isOrganizer}
              windowOpen={Date.now() < plan.disputeWindowEnds}
            />
          )}

          {/* Resolved history */}
          {resolved.length > 0 && (
            <div className="mt-6 pt-5 border-t border-ink-700/60">
              <div className="text-xs uppercase tracking-wider text-slate-500 font-semibold mb-3">
                Resolved disputes
              </div>
              <div className="space-y-3">
                {resolved.map((d) => (
                  <ResolvedDisputeCard
                    key={d.id}
                    plan={plan}
                    dispute={d}
                    wallet={wallet}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- File new dispute ----------------------------------------------------

function FileDisputeForm({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      store.fileDispute({ planId: plan.id, reason, evidence });
      setOpen(false);
      setReason('');
      setEvidence('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to file dispute');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="rounded-lg border border-warn-500/20 bg-warn-500/5 p-4 flex items-center justify-between gap-4">
        <div className="text-sm text-slate-300">
          Did the organizer fail to deliver? File a dispute to start the arbitration process.
        </div>
        <button
          onClick={() => setOpen(true)}
          className="btn-secondary !bg-warn-500/20 !text-warn-400 hover:!bg-warn-500/30 shrink-0"
        >
          <ShieldAlert size={14} />
          File dispute
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-warn-500/30 bg-warn-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ShieldAlert size={16} className="text-warn-400" />
        <h3 className="font-display font-semibold text-white">File a dispute</h3>
      </div>

      <div>
        <label className="label">Reason for dispute</label>
        <textarea
          className="input min-h-[90px] resize-none"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Describe what went wrong. Did the event not happen? Were committers not refunded? (min 20 chars)"
          required
          minLength={20}
        />
        <div className="text-xs text-slate-500 mt-1">
          {reason.length} / 20 minimum
        </div>
      </div>

      <div>
        <label className="label">Evidence (optional)</label>
        <textarea
          className="input min-h-[60px] resize-none"
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          placeholder="Links, screenshots, transaction hashes, photos. Anything that supports your case."
        />
      </div>

      {error && (
        <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-3 py-2 text-sm text-danger-400">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="btn-ghost"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting || reason.trim().length < 20}
          className="btn-primary"
        >
          {submitting ? (
            <>
              <Loader size={14} /> Filing…
            </>
          ) : (
            <>
              <ShieldAlert size={14} />
              File dispute
            </>
          )}
        </button>
      </div>

      <div className="text-xs text-slate-500 italic pt-2 border-t border-ink-700/60">
        Filing opens a 48-hour vote window for other committers. If a majority supports the
        dispute, it can be escalated to the KFP Arbitration team — an external review service
        operated by NYU Stern Blockchain &amp; Fintech Club staff.
      </div>
    </form>
  );
}

// --- Active dispute card -------------------------------------------------

function DisputeCard({
  plan,
  dispute,
  wallet,
  onOpenArbitration,
}: {
  plan: Plan;
  dispute: Dispute;
  wallet: Wallet | null;
  onOpenArbitration: (id: string) => void;
}) {
  const me = wallet?.address ?? null;
  const summary = voteSummary(dispute, plan.committers.length);
  const myVote = me ? dispute.votes.find((v) => v.voter === me) : null;
  const canVote =
    !!me &&
    plan.committers.includes(me) &&
    plan.organizer !== me &&
    !myVote &&
    (dispute.status === 'voting' || dispute.status === 'awaiting_submission');

  const [busy, setBusy] = useState<string | null>(null);

  const cast = async (support: boolean) => {
    setBusy(support ? 'support' : 'oppose');
    try {
      await new Promise((r) => setTimeout(r, 400));
      store.voteOnDispute(dispute.id, support);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      setBusy(null);
    }
  };

  const submit = async () => {
    setBusy('submit');
    try {
      await new Promise((r) => setTimeout(r, 800));
      store.submitToArbitration(dispute.id);
      onOpenArbitration(dispute.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-warn-500/30 bg-warn-500/5 p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="badge bg-warn-500/20 text-warn-400 ring-1 ring-warn-500/40">
            {dispute.status === 'under_review' && (
              <Loader size={12} className="text-warn-400" />
            )}
            {disputeStatusLabel(dispute.status)}
          </span>
          <span className="text-xs text-slate-500">
            filed {fmtRelative(dispute.filedAt)} by{' '}
            <span className="font-mono text-slate-300">
              {shortAddr(dispute.filedBy)}
              {dispute.filedBy === me && ' (you)'}
            </span>
          </span>
        </div>
        {dispute.status === 'voting' && (
          <span className="text-xs text-slate-400 font-mono">
            <Clock size={12} className="inline mr-1 -mt-0.5" />
            {fmtTimeUntil(dispute.voteDeadline)} left
          </span>
        )}
      </div>

      <div className="text-sm text-slate-200 mb-2">
        <span className="text-slate-400">Reason: </span>
        {dispute.reason}
      </div>
      {dispute.evidence && (
        <div className="text-xs text-slate-400 mb-3 italic">
          <span className="not-italic font-semibold text-slate-300">Evidence:</span>{' '}
          {dispute.evidence}
        </div>
      )}

      {/* Vote tally */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-400">
            <span className="text-signal-400 font-semibold">{summary.support}</span> support
            {' · '}
            <span className="text-danger-400 font-semibold">{summary.oppose}</span> oppose
            {' · '}
            <span className="text-slate-300 font-semibold">{summary.total}</span> / {plan.committers.length} voted
          </span>
          <span
            className={`font-mono ${
              summary.quorumMet ? 'text-signal-400' : 'text-slate-500'
            }`}
          >
            quorum: {summary.total}/{summary.quorumNeeded}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-ink-700 overflow-hidden flex">
          <div
            className="bg-signal-500 transition-all"
            style={{ width: `${(summary.support / Math.max(1, plan.committers.length)) * 100}%` }}
          />
          <div
            className="bg-danger-500 transition-all"
            style={{ width: `${(summary.oppose / Math.max(1, plan.committers.length)) * 100}%` }}
          />
        </div>
      </div>

      {/* Action row */}
      <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
        <div className="text-xs text-slate-500">
          {myVote ? (
            <span className="inline-flex items-center gap-1 text-slate-400">
              {myVote.support ? <ThumbsUp size={12} /> : <ThumbsDown size={12} />}
              You voted {myVote.support ? 'support' : 'oppose'}
            </span>
          ) : canVote ? (
            <span>Cast your vote as a committer.</span>
          ) : plan.organizer === me ? (
            <span className="italic">As the organizer, you cannot vote on this dispute.</span>
          ) : !me ? (
            <span>Connect a wallet to participate.</span>
          ) : !plan.committers.includes(me) ? (
            <span className="italic">Only committers may vote.</span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          {canVote && (
            <>
              <button
                onClick={() => cast(true)}
                disabled={busy !== null}
                className="btn-secondary !bg-signal-500/15 !text-signal-400 hover:!bg-signal-500/25"
              >
                {busy === 'support' ? <Loader size={14} /> : <ThumbsUp size={14} />}
                Support
              </button>
              <button
                onClick={() => cast(false)}
                disabled={busy !== null}
                className="btn-secondary !bg-danger-500/15 !text-danger-400 hover:!bg-danger-500/25"
              >
                {busy === 'oppose' ? <Loader size={14} /> : <ThumbsDown size={14} />}
                Oppose
              </button>
            </>
          )}

          {dispute.status === 'awaiting_submission' && (
            <button onClick={submit} disabled={busy !== null} className="btn-primary">
              {busy === 'submit' ? (
                <>
                  <Loader size={14} /> Submitting…
                </>
              ) : (
                <>
                  <Send size={14} />
                  Submit to Arbitration
                </>
              )}
            </button>
          )}

          {dispute.status === 'under_review' && (
            <button
              onClick={() => onOpenArbitration(dispute.id)}
              className="btn-secondary"
            >
              <Gavel size={14} />
              View case {dispute.caseId}
            </button>
          )}
        </div>
      </div>

      {/* Demo affordance: simulate other committers voting */}
      {dispute.status === 'voting' && (
        <DemoVoteSim plan={plan} dispute={dispute} />
      )}
    </div>
  );
}

function DemoVoteSim({ plan, dispute }: { plan: Plan; dispute: Dispute }) {
  const remaining = plan.committers.length - dispute.votes.length;
  if (remaining <= 0) return null;
  return (
    <div className="mt-4 pt-3 border-t border-ink-700/60 flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500">
        Demo: {remaining} committer(s) haven't voted yet.
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => store.simulateVotes(dispute.id, { allSupport: true })}
          className="btn-ghost text-xs"
        >
          <Sparkles size={12} />
          All support
        </button>
        <button
          onClick={() => store.simulateVotes(dispute.id, { mixed: true })}
          className="btn-ghost text-xs"
        >
          <Sparkles size={12} />
          Mixed
        </button>
      </div>
    </div>
  );
}

// --- Resolved dispute card -----------------------------------------------

function ResolvedDisputeCard({
  plan,
  dispute,
  wallet,
}: {
  plan: Plan;
  dispute: Dispute;
  wallet: Wallet | null;
}) {
  const me = wallet?.address ?? null;
  const summary = voteSummary(dispute, plan.committers.length);

  const tone =
    dispute.status === 'upheld'
      ? 'good'
      : dispute.status === 'rejected'
      ? 'bad'
      : 'neutral';

  const styles = {
    good: 'border-signal-500/30 bg-signal-500/5',
    bad: 'border-slate-600/40 bg-ink-800/40',
    neutral: 'border-slate-600/40 bg-ink-800/40',
  }[tone];

  const Icon =
    dispute.status === 'upheld'
      ? CheckCircle
      : dispute.status === 'rejected'
      ? XCircle
      : XCircle;
  const iconColor =
    dispute.status === 'upheld' ? 'text-signal-400' : 'text-slate-400';

  return (
    <div className={`rounded-lg border ${styles} p-4`}>
      <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2 text-sm">
          <Icon size={16} className={iconColor} />
          <span className="font-semibold text-white">
            {disputeStatusLabel(dispute.status)}
          </span>
          {dispute.caseId && (
            <span className="text-xs text-slate-500 font-mono">
              <Hash size={11} className="inline -mt-0.5" />
              {dispute.caseId.replace('KFP-', '')}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">
          {dispute.arbitrationResolvedAt && fmtRelative(dispute.arbitrationResolvedAt)}
        </span>
      </div>

      <div className="text-xs text-slate-400 mb-2">
        Filed by{' '}
        <span className="font-mono text-slate-300">
          {shortAddr(dispute.filedBy)}
          {dispute.filedBy === me && ' (you)'}
        </span>
        {' · '}
        Vote: {summary.support}/{summary.total} support
      </div>

      <div className="text-xs text-slate-300 italic line-clamp-2">"{dispute.reason}"</div>

      {dispute.arbitrationVerdict && (
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-signal-400 hover:text-signal-300">
            Read full verdict
          </summary>
          <pre className="mt-2 text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed bg-ink-950/50 p-3 rounded">
            {dispute.arbitrationVerdict}
          </pre>
        </details>
      )}
    </div>
  );
}

// --- Empty state ---------------------------------------------------------

function EmptyState({
  isCommitter,
  isOrganizer,
  windowOpen,
}: {
  isCommitter: boolean;
  isOrganizer: boolean;
  windowOpen: boolean;
}) {
  return (
    <div className="rounded-lg border border-ink-700/60 bg-ink-900/40 p-5 text-center">
      <ShieldCheck size={24} className="mx-auto text-signal-500 mb-2" />
      <div className="text-sm text-slate-300 mb-1">No disputes filed.</div>
      <div className="text-xs text-slate-500">
        {!windowOpen
          ? 'The dispute window has closed for this plan.'
          : isOrganizer
          ? 'As organizer, deliver as agreed and committers have nothing to dispute.'
          : isCommitter
          ? 'You can file a dispute if the organizer fails to deliver.'
          : 'Only committers may file disputes.'}
      </div>
    </div>
  );
}

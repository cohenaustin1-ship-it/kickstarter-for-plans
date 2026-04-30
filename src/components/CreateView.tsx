import { useState } from 'react';
import { store } from '../lib/store';
import type { Wallet, UserAccount } from '../lib/types';
import { ArrowLeft, Loader, Plus, Lock } from './icons';

interface Props {
  wallet: Wallet | null;
  account: UserAccount | null;
  onCreated: (id: number) => void;
  onCancel: () => void;
}

export function CreateView({ wallet, account, onCreated, onCancel }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [costPerHead, setCostPerHead] = useState('');
  const [threshold, setThreshold] = useState('');

  const defaultDeadline = (() => {
    const d = new Date(Date.now() + 7 * 86400 * 1000);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();
  const [deadline, setDeadline] = useState(defaultDeadline);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!wallet) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="card p-10">
          <h2 className="font-display text-2xl font-semibold text-white mb-2">
            Connect a wallet to create plans
          </h2>
          <p className="text-slate-400 mb-6">
            In the production dApp, this is gated behind Privy auth. For the demo, click{' '}
            <span className="text-signal-400 font-semibold">Connect Wallet</span> in the header
            to get a sandboxed wallet with 5,000 mock USDC.
          </p>
          <button onClick={() => store.connect()} className="btn-primary">
            Connect Demo Wallet
          </button>
        </div>
      </div>
    );
  }

  if (account?.isFrozen) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20">
        <button onClick={onCancel} className="btn-ghost text-sm mb-4 -ml-2">
          <ArrowLeft size={14} /> Back
        </button>
        <div className="card p-10 border-danger-500/40 bg-danger-500/5">
          <div className="flex items-center gap-3 mb-4">
            <Lock size={28} className="text-danger-400" />
            <h2 className="font-display text-2xl font-semibold text-white">
              Account frozen
            </h2>
          </div>
          <p className="text-slate-300 mb-3">
            Your wallet has been frozen by the KFP Arbitration team and cannot create new
            plans.
          </p>
          {account.frozenReason && (
            <div className="text-sm text-slate-400 italic border-l-2 border-danger-500/40 pl-3 my-3">
              {account.frozenReason}
            </div>
          )}
          <p className="text-xs text-slate-500 mt-4">
            To appeal, contact compliance@kfp.example with case ID and supporting evidence.
          </p>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      const cost = Number(costPerHead);
      const thr = Number(threshold);
      const deadlineMs = new Date(deadline).getTime();
      if (!title.trim()) throw new Error('Title required');
      if (!Number.isFinite(cost) || cost <= 0) throw new Error('Cost must be > 0');
      if (!Number.isInteger(thr) || thr <= 0)
        throw new Error('Threshold must be a positive integer');
      if (!Number.isFinite(deadlineMs) || deadlineMs <= Date.now())
        throw new Error('Deadline must be in the future');
      const plan = store.createPlan({
        title: title.trim(),
        description: description.trim(),
        costPerHead: cost,
        threshold: thr,
        deadline: deadlineMs,
      });
      onCreated(plan.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create plan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8">
        <button onClick={onCancel} className="btn-ghost text-sm mb-3 -ml-2">
          <ArrowLeft size={14} /> Back
        </button>
        <h1 className="font-display text-3xl font-bold text-white mb-2">Create a Plan</h1>
        <p className="text-slate-400">
          Sets up the on-chain Plan struct, emits{' '}
          <code className="font-mono text-signal-400">PlanCreated</code>, and locks in the
          threshold + deadline. You can create as many plans as you want — each is independent.
        </p>
      </div>

      <form onSubmit={onSubmit} className="card p-6 space-y-5">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Dinner at Atera"
            required
          />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this plan? When? Where?"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Cost per head (USDC)</label>
            <input
              className="input"
              type="number"
              step="1"
              min="1"
              value={costPerHead}
              onChange={(e) => setCostPerHead(e.target.value)}
              placeholder="300"
              required
            />
          </div>
          <div>
            <label className="label">Threshold (people)</label>
            <input
              className="input"
              type="number"
              step="1"
              min="1"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="6"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Deadline</label>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
          <p className="text-xs text-slate-500 mt-1.5">
            After this, anyone can call{' '}
            <code className="font-mono">finalize()</code>. A 7-day dispute window opens
            after the deadline during which committers can challenge non-delivery.
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button type="button" onClick={onCancel} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? (
              <>
                <Loader size={14} /> Submitting tx…
              </>
            ) : (
              <>
                <Plus size={14} /> Create Plan
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-xs text-slate-500">
        On-chain this calls{' '}
        <code className="font-mono text-slate-400">PlanEscrow.createPlan(...)</code> and emits
        a <code className="font-mono text-slate-400">PlanCreated</code> event.
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useStore, useTick } from './lib/store';
import { Header, type ViewName } from './components/Header';
import { Footer } from './components/Footer';
import { DemoBanner } from './components/DemoBanner';
import { BrowseView } from './components/BrowseView';
import { CreateView } from './components/CreateView';
import { PlanDetailView } from './components/PlanDetailView';
import { MyEventsView } from './components/MyEventsView';
import { ArbitrationView } from './components/ArbitrationView';

type View =
  | { name: 'browse' }
  | { name: 'create' }
  | { name: 'detail'; planId: number }
  | { name: 'my-events' }
  | { name: 'arbitration'; disputeId: string };

function App() {
  const state = useStore();
  useTick(15_000); // re-render every 15s for live countdowns / arbitration progress
  const [view, setView] = useState<View>({ name: 'browse' });

  const account = useMemo(
    () => (state.wallet ? state.accounts[state.wallet.address] ?? null : null),
    [state.wallet, state.accounts]
  );

  const currentPlan =
    view.name === 'detail' ? state.plans.find((p) => p.id === view.planId) : null;

  const currentDispute =
    view.name === 'arbitration' ? state.disputes[view.disputeId] : null;
  const arbitrationPlan =
    currentDispute ? state.plans.find((p) => p.id === currentDispute.planId) ?? null : null;

  // Derived: dispute counts surfaced on My Events page
  const disputeCounts = useMemo(() => {
    if (!state.wallet) return { open: 0, resolved: 0 };
    const me = state.wallet.address;
    let open = 0;
    let resolved = 0;
    for (const d of Object.values(state.disputes)) {
      const plan = state.plans.find((p) => p.id === d.planId);
      if (!plan) continue;
      const involved =
        plan.organizer === me || plan.committers.includes(me) || d.filedBy === me;
      if (!involved) continue;
      if (d.status === 'voting' || d.status === 'awaiting_submission' || d.status === 'under_review') {
        open++;
      } else {
        resolved++;
      }
    }
    return { open, resolved };
  }, [state.disputes, state.plans, state.wallet]);

  const headerView: ViewName = view.name;

  const handleNav = (v: 'browse' | 'create' | 'my-events') => {
    if (v === 'browse') setView({ name: 'browse' });
    else if (v === 'create') setView({ name: 'create' });
    else setView({ name: 'my-events' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <DemoBanner />
      <Header
        wallet={state.wallet}
        account={account}
        view={headerView}
        onNav={handleNav}
      />

      <main className="flex-1">
        {view.name === 'browse' && (
          <BrowseView
            plans={state.plans}
            accounts={state.accounts}
            disputes={state.disputes}
            onSelect={(id) => setView({ name: 'detail', planId: id })}
            onCreate={() => setView({ name: 'create' })}
          />
        )}

        {view.name === 'create' && (
          <CreateView
            wallet={state.wallet}
            account={account}
            onCreated={(id) => setView({ name: 'detail', planId: id })}
            onCancel={() => setView({ name: 'browse' })}
          />
        )}

        {view.name === 'detail' && currentPlan && (
          <PlanDetailView
            plan={currentPlan}
            wallet={state.wallet}
            state={state}
            onBack={() => setView({ name: 'browse' })}
            onOpenArbitration={(disputeId) =>
              setView({ name: 'arbitration', disputeId })
            }
          />
        )}

        {view.name === 'detail' && !currentPlan && (
          <div className="max-w-2xl mx-auto px-6 py-20 text-center">
            <div className="card p-10">
              <h2 className="font-display text-xl font-semibold text-white mb-2">
                Plan not found
              </h2>
              <button
                onClick={() => setView({ name: 'browse' })}
                className="btn-primary mt-4"
              >
                Back to browse
              </button>
            </div>
          </div>
        )}

        {view.name === 'my-events' && (
          <MyEventsView
            wallet={state.wallet}
            account={account}
            plans={state.plans}
            disputeCounts={disputeCounts}
            onSelect={(id) => setView({ name: 'detail', planId: id })}
            onCreate={() => setView({ name: 'create' })}
          />
        )}

        {view.name === 'arbitration' && (
          <ArbitrationView
            disputeId={view.disputeId}
            dispute={currentDispute}
            plan={arbitrationPlan}
            wallet={state.wallet}
            onBack={() => {
              if (currentDispute) {
                setView({ name: 'detail', planId: currentDispute.planId });
              } else {
                setView({ name: 'browse' });
              }
            }}
          />
        )}
      </main>

      <Footer />
    </div>
  );
}

export default App;

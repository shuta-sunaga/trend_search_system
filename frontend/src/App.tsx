import { useTrends } from './hooks/useTrends';
import { StatusBar } from './components/StatusBar';
import { TrendList } from './components/TrendList';
import { PromptSidebar } from './components/PromptSidebar';
import './App.css';

function App() {
  const { trends, status, loading, updating, error, triggerUpdate } = useTrends();

  return (
    <div className="app">
      <header className="app-header">
        <h1>Trend Search</h1>
        <p className="app-subtitle">Real-time news & trend aggregator</p>
      </header>

      <StatusBar status={status} updating={updating} onUpdate={triggerUpdate} />

      {error && <div className="error-banner">Error: {error}</div>}

      <main className="app-main">
        {loading ? (
          <div className="loading">Loading trends...</div>
        ) : (
          <TrendList trends={trends?.trends ?? []} />
        )}
      </main>

      <PromptSidebar />
    </div>
  );
}

export default App;

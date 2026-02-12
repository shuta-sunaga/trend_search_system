import type { StatusResponse } from '../types';

interface Props {
  status: StatusResponse | null;
  updating: boolean;
  onUpdate: () => void;
}

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--';
  return new Date(dateStr).toLocaleString('ja-JP');
}

function formatCountdown(nextUpdate: string | null): string {
  if (!nextUpdate) return '--';
  const diff = new Date(nextUpdate).getTime() - Date.now();
  if (diff <= 0) return 'updating...';
  const minutes = Math.floor(diff / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

export function StatusBar({ status, updating, onUpdate }: Props) {
  return (
    <div className="status-bar">
      <div className="status-info">
        <span className="status-item">
          Last update: <strong>{formatTime(status?.lastUpdateAt ?? null)}</strong>
        </span>
        <span className="status-item">
          Next: <strong>{formatCountdown(status?.nextUpdateAt ?? null)}</strong>
        </span>
        <span className="status-item">
          Trends: <strong>{status?.trendCount ?? 0}</strong>
        </span>
        <span className="status-item">
          Items: <strong>{status?.itemCount ?? 0}</strong>
        </span>
      </div>
      <button
        className="update-button"
        onClick={onUpdate}
        disabled={updating || (status?.isRunning ?? false)}
      >
        {updating || status?.isRunning ? 'Updating...' : 'Update Now'}
      </button>
    </div>
  );
}

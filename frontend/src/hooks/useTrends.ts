import { useState, useEffect, useCallback } from 'react';
import type { TrendsResponse, StatusResponse } from '../types';

const API_BASE = '/api';

export function useTrends(pollIntervalMs = 30_000) {
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrends = useCallback(async () => {
    try {
      const [trendsRes, statusRes] = await Promise.all([
        fetch(`${API_BASE}/trends`),
        fetch(`${API_BASE}/status`),
      ]);
      if (trendsRes.ok) setTrends(await trendsRes.json());
      if (statusRes.ok) setStatus(await statusRes.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch');
    } finally {
      setLoading(false);
    }
  }, []);

  const triggerUpdate = useCallback(async () => {
    setUpdating(true);
    try {
      const res = await fetch(`${API_BASE}/update`, { method: 'POST' });
      if (res.status === 409) {
        // Already running, just wait
        return;
      }
      if (!res.ok) throw new Error('Update failed');
      await fetchTrends();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setUpdating(false);
    }
  }, [fetchTrends]);

  useEffect(() => {
    fetchTrends();
    const interval = setInterval(fetchTrends, pollIntervalMs);
    return () => clearInterval(interval);
  }, [fetchTrends, pollIntervalMs]);

  return { trends, status, loading, updating, error, triggerUpdate, refresh: fetchTrends };
}

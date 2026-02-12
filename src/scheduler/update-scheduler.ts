export type UpdateFn = () => Promise<void>;

export class UpdateScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private intervalMs: number;
  private updateFn: UpdateFn;
  private _isRunning = false;
  private _lastUpdateAt: Date | null = null;
  private _nextUpdateAt: Date | null = null;

  constructor(updateFn: UpdateFn, intervalMs: number = 3_600_000) {
    this.updateFn = updateFn;
    this.intervalMs = intervalMs;
  }

  start(): void {
    if (this.intervalId) return;

    this.intervalId = setInterval(() => {
      this.triggerNow().catch(() => {});
    }, this.intervalMs);

    this._nextUpdateAt = new Date(Date.now() + this.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this._nextUpdateAt = null;
    }
  }

  async triggerNow(): Promise<{ started: boolean }> {
    if (this._isRunning) {
      return { started: false };
    }

    this._isRunning = true;
    try {
      await this.updateFn();
      this._lastUpdateAt = new Date();
      if (this.intervalId) {
        this._nextUpdateAt = new Date(Date.now() + this.intervalMs);
      }
      return { started: true };
    } finally {
      this._isRunning = false;
    }
  }

  getStatus() {
    return {
      isRunning: this._isRunning,
      lastUpdateAt: this._lastUpdateAt,
      nextUpdateAt: this._nextUpdateAt,
      intervalMs: this.intervalMs,
      isScheduled: this.intervalId !== null,
    };
  }
}

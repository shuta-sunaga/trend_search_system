import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UpdateScheduler } from '../../src/scheduler/update-scheduler.js';

describe('UpdateScheduler', () => {
  let updateFn: ReturnType<typeof vi.fn>;
  let scheduler: UpdateScheduler;

  beforeEach(() => {
    vi.useFakeTimers();
    updateFn = vi.fn().mockResolvedValue(undefined);
    scheduler = new UpdateScheduler(updateFn, 60_000); // 1 minute
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  it('should trigger update immediately with triggerNow', async () => {
    await scheduler.triggerNow();
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('should prevent concurrent updates', async () => {
    let resolveFirst: () => void;
    const firstCall = new Promise<void>((r) => { resolveFirst = r; });
    updateFn.mockImplementationOnce(() => firstCall);

    const trigger1 = scheduler.triggerNow();
    const { started } = await scheduler.triggerNow();
    expect(started).toBe(false);

    resolveFirst!();
    const result1 = await trigger1;
    expect(result1.started).toBe(true);
    expect(updateFn).toHaveBeenCalledOnce();
  });

  it('should auto-update at interval after start', async () => {
    scheduler.start();

    // Advance by one interval
    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateFn).toHaveBeenCalledOnce();

    // Advance by another interval
    await vi.advanceTimersByTimeAsync(60_000);
    expect(updateFn).toHaveBeenCalledTimes(2);
  });

  it('should stop auto-updates on stop', async () => {
    scheduler.start();
    scheduler.stop();

    await vi.advanceTimersByTimeAsync(120_000);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('should track lastUpdateAt after update', async () => {
    expect(scheduler.getStatus().lastUpdateAt).toBeNull();

    await scheduler.triggerNow();
    expect(scheduler.getStatus().lastUpdateAt).toBeInstanceOf(Date);
  });

  it('should track nextUpdateAt when scheduled', () => {
    expect(scheduler.getStatus().nextUpdateAt).toBeNull();

    scheduler.start();
    expect(scheduler.getStatus().nextUpdateAt).toBeInstanceOf(Date);

    scheduler.stop();
    expect(scheduler.getStatus().nextUpdateAt).toBeNull();
  });

  it('should report isRunning status during update', async () => {
    let captured = false;
    updateFn.mockImplementationOnce(async () => {
      captured = scheduler.getStatus().isRunning;
    });

    await scheduler.triggerNow();
    expect(captured).toBe(true);
    expect(scheduler.getStatus().isRunning).toBe(false);
  });

  it('should report isScheduled status', () => {
    expect(scheduler.getStatus().isScheduled).toBe(false);
    scheduler.start();
    expect(scheduler.getStatus().isScheduled).toBe(true);
    scheduler.stop();
    expect(scheduler.getStatus().isScheduled).toBe(false);
  });

  it('should not double-start', () => {
    scheduler.start();
    scheduler.start(); // second call should be no-op
    scheduler.stop();
    // No errors expected
  });

  it('should reset isRunning on update failure', async () => {
    updateFn.mockRejectedValueOnce(new Error('fail'));

    await expect(scheduler.triggerNow()).rejects.toThrow('fail');
    expect(scheduler.getStatus().isRunning).toBe(false);
  });
});

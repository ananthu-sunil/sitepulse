import { afterEach, describe, expect, it, vi } from "vitest";
import { startScheduler } from "./scheduler.js";

describe("startScheduler", () => {
  afterEach(() => {vi.useRealTimers();});
  it("runs the task immediately", async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockResolvedValue(undefined);
    startScheduler(task, 1000);

    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
  });

  it("runs the task again after the interval", async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockResolvedValue(undefined);
    startScheduler(task, 1000);

    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
  });

  it("stops future executions", async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockResolvedValue(undefined);
    const scheduler = startScheduler(task, 1000);

    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);
  });


  it("resolves done when stopped while waiting", async () => {
    vi.useFakeTimers();
    const task = vi.fn().mockResolvedValue(undefined);
    const scheduler = startScheduler(task, 1000);

    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
    scheduler.stop();
    await expect(scheduler.done).resolves.toBeUndefined();
  });

  it("waits for the current task to finish before resolving done", async () => {
    vi.useFakeTimers();
    let resolveTask!: () => void;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );
    const scheduler = startScheduler(task, 1000);
    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
    scheduler.stop();
    let shutdownComplete = false;
    void scheduler.done.then(() => {shutdownComplete = true;});
    await Promise.resolve();

    expect(shutdownComplete).toBe(false);
    resolveTask();
    await scheduler.done;
    expect(shutdownComplete).toBe(true);
  });

  it("does not overlap task executions", async () => {
    vi.useFakeTimers();
    let resolveTask!: () => void;
    const task = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );
    startScheduler(task, 1000);
    
    await vi.waitFor(() => {expect(task).toHaveBeenCalledTimes(1);});
    await vi.advanceTimersByTimeAsync(5000);
    expect(task).toHaveBeenCalledTimes(1);
    resolveTask();
    await vi.advanceTimersByTimeAsync(1000);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
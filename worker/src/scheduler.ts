export function startScheduler(task: () => Promise<void>, intervalMs: number,): {
  stop: () => void;
  done: Promise<void>;} 
  {
  let stopped = false;
  let running = false;
  let timeout: NodeJS.Timeout | undefined;
  let resolveDone!: () => void;

  const done = new Promise<void>((resolve) => {resolveDone = resolve;});

  const run = async (): Promise<void> => {
    if (stopped) {resolveDone(); return;}
    running = true;
    try {
      await task();

    } catch (error) {
      console.error("Scheduled task failed:", error);

    } finally {
      running = false;
    }

    if (stopped) {resolveDone();return;}
    timeout = setTimeout(() => {void run();}, intervalMs);};

  const stop = (): void => {
    if (stopped) {return;}
    stopped = true;
    if (timeout) {clearTimeout(timeout); timeout = undefined;}
    if (!running) {resolveDone();}
  };

  void run();
  return {stop,done,};
}
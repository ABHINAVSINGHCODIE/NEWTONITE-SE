import { OutboxService } from '../services/outboxService';

export class OutboxWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private intervalMs: number;

  constructor(intervalMs = 3000) {
    this.intervalMs = intervalMs;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[OutboxWorker] Started background worker (interval: ${this.intervalMs}ms)`);

    this.timer = setInterval(async () => {
      try {
        const result = await OutboxService.processPendingJobs(20);
        if (result.processed > 0) {
          console.log(
            `[OutboxWorker] Processed ${result.processed} jobs (${result.succeeded} succeeded, ${result.failed} failed)`
          );
        }
      } catch (err) {
        console.error('[OutboxWorker] Error during outbox processing:', err);
      }
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log('[OutboxWorker] Stopped background worker');
  }
}

// If executed directly from CLI (e.g., npm run worker)
if (require.main === module) {
  const worker = new OutboxWorker(2000);
  worker.start();

  process.on('SIGINT', () => {
    worker.stop();
    process.exit(0);
  });
}

import app from './app';
import { config } from './config';
import { OutboxWorker } from './worker/outboxWorker';

const server = app.listen(config.port, () => {
  console.log(`[Newtonite API] Server listening on port ${config.port}`);
  console.log(`[Newtonite API] Environment: ${config.nodeEnv}`);

  // Start the background transactional outbox worker
  const worker = new OutboxWorker(3000);
  worker.start();
});

export default server;

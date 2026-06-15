import { GAEngine } from '../ga/engine';
import type { GAConfig, WorkerCommand, WorkerMessage, Snapshot } from '../ga/types';

let engine: GAEngine | null = null;
let running = false;
let paused  = false;
let lastSentAt = 0;
const MIN_INTERVAL_MS = 33; // ~30 snapshots/sec max

function send(msg: WorkerMessage, transfer?: Transferable[]): void {
  (self as unknown as Worker).postMessage(msg, { transfer: transfer ?? [] });
}

function sendSnapshot(snap: Snapshot, force = false): void {
  const now = Date.now();
  if (!force && now - lastSentAt < MIN_INTERVAL_MS) return;
  lastSentAt = now;
  // Transfer the coords buffer to avoid copying
  const coords = snap.bestCoords.slice();
  send({ type: 'snapshot', snapshot: { ...snap, bestCoords: coords } }, [coords.buffer]);
}

async function runLoop(): Promise<void> {
  while (running) {
    if (paused) { await sleep(50); continue; }
    try {
      const snap = engine!.step();
      sendSnapshot(snap);
    } catch (err) {
      send({ type: 'error', message: String(err) });
      running = false;
      break;
    }
    // Yield to the event loop so incoming messages can be processed
    await sleep(0);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(self as unknown as Worker).onmessage = (e: MessageEvent<WorkerCommand>) => {
  const cmd = e.data;
  switch (cmd.type) {
    case 'start':
      engine = new GAEngine(cmd.config as GAConfig);
      engine.initialize();
      running = true;
      paused  = false;
      runLoop();
      break;
    case 'pause':
      paused = true;
      break;
    case 'resume':
      paused = false;
      break;
    case 'step':
      if (engine) {
        paused = true;
        sendSnapshot(engine.step(), true);
      }
      break;
    case 'stop':
      running = false;
      break;
    case 'reset':
      running = false;
      engine  = null;
      break;
    case 'updateParams':
      engine?.updateConfig(cmd.params as Partial<GAConfig>);
      break;
  }
};

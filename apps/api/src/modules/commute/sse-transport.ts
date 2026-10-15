import type { ServerResponse } from 'node:http';
import { CommuteExecutionService, CommuteSseEvent } from './commute-execution.service.js';

/**
 * Standard SSE response headers to disable reverse-proxy buffering
 * (e.g. NGINX, Cloud Run, Cloudflare) and maintain persistent HTTP/1.1 or HTTP/2 sockets.
 */
export const SSE_RESPONSE_HEADERS = {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const;

export interface SseStreamOptions {
  heartbeatIntervalMs?: number; // Default 25,000ms for MTN/Telecel NAT persistence
}

/**
 * Attaches a client HTTP response socket to a commute's SSE event stream.
 *
 * Implements:
 * 1. Immediate flush of proxy-buffering disabling headers (`X-Accel-Buffering: no`).
 * 2. Immediate connection acknowledgment comment frame (`: connected\n\n`).
 * 3. Subscription to CommuteExecutionService domain events (`STATE_SNAPSHOT`, `COMMUTE_LOCKING`, etc.).
 * 4. Periodic 25-second heartbeat (`: heartbeat\n\n`) to prevent cellular carrier NAT disconnects.
 * 5. Automatic cleanup and unsubscription on socket disconnect.
 */
export function attachCommuteSseStream(
  res: ServerResponse,
  commuteId: string,
  commuteExecutionService: CommuteExecutionService,
  options: SseStreamOptions = {},
): () => void {
  const heartbeatInterval = options.heartbeatIntervalMs ?? 25000;

  // Set authoritative headers
  res.writeHead(200, SSE_RESPONSE_HEADERS);

  // Send immediate comment frame
  res.write(': connected\n\n');

  // Pipe domain events
  const unsubscribe = commuteExecutionService.subscribeToCommuteEvents(
    commuteId,
    (event: CommuteSseEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
  );

  // 25-second heartbeat prevents carrier NAT timeout along Ablekuma-Osu corridor
  const timer = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, heartbeatInterval);

  let cleanedUp = false;
  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    clearInterval(timer);
    unsubscribe();
  };

  res.on('close', cleanup);
  res.on('finish', cleanup);

  return cleanup;
}

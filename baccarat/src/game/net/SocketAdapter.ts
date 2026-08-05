import type { GameConfig } from "../Config";
import { Logger } from "../utils/Logger";
import {
  ConnectionState,
  ServerEvent,
  type ClientEvent,
  type ClientEventMap,
  type NetworkAdapter,
  type ServerEventHandler,
  type ServerEventMap,
} from "./protocol";

/**
 * Minimal transport shape shared by `WebSocket` and a Socket.IO client, so the
 * adapter can drive either without pulling in socket.io-client as a dependency.
 */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  addEventListener?(type: string, listener: (event: unknown) => void): void;
  on?(event: string, listener: (...args: unknown[]) => void): void;
  emit?(event: string, payload: unknown): void;
}

export type SocketFactory = (url: string) => SocketLike;

export interface SocketAdapterOptions {
  readonly url: string;
  readonly tableId: string;
  readonly reconnectDelayMs: number;
  readonly maxReconnectAttempts: number;
  /** Supply a Socket.IO client here; defaults to a native WebSocket. */
  readonly socketFactory?: SocketFactory;
  /** Auth token appended as a query parameter, if your gateway wants one. */
  readonly token?: string;
}

interface Envelope {
  event: string;
  payload: unknown;
}

/** Socket.IO hands back anything as a disconnect reason; keep it printable. */
function describeReason(value: unknown): string {
  return typeof value === "string" ? value : "closed";
}

/**
 * Remote transport.
 *
 * Frames are `{ event, payload }` JSON envelopes whose `event` values are the
 * `ServerEvent` / `ClientEvent` strings — see `docs/BACKEND_INTEGRATION.md`.
 * Reconnection uses capped exponential backoff and re-announces the table on
 * every successful open, so a dropped connection self-heals without the game
 * layer knowing anything happened.
 */
export class SocketAdapter implements NetworkAdapter {
  private readonly log = Logger.create("net:socket");
  private readonly handlers = new Map<ServerEvent, Set<(payload: unknown) => void>>();
  private readonly options: SocketAdapterOptions;

  private socket: SocketLike | null = null;
  private state = ConnectionState.Idle;
  private attempts = 0;
  private reconnectHandle: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  /** Buffers client messages produced while the socket is down. */
  private readonly outbox: Envelope[] = [];

  constructor(options: SocketAdapterOptions) {
    this.options = options;
  }

  static fromConfig(config: GameConfig, socketFactory?: SocketFactory): SocketAdapter {
    if (!config.network.url) {
      throw new Error("[baccarat:net] network.mode is 'remote' but network.url is null");
    }
    return new SocketAdapter({
      url: config.network.url,
      tableId: config.tableId,
      reconnectDelayMs: config.network.reconnectDelayMs,
      maxReconnectAttempts: config.network.maxReconnectAttempts,
      ...(socketFactory ? { socketFactory } : {}),
    });
  }

  get connectionState(): ConnectionState {
    return this.state;
  }

  connect(): Promise<void> {
    if (this.disposed || this.state === ConnectionState.Open) return Promise.resolve();
    this.state = this.attempts === 0 ? ConnectionState.Connecting : ConnectionState.Reconnecting;

    const url = this.options.token
      ? `${this.options.url}?token=${encodeURIComponent(this.options.token)}`
      : this.options.url;

    try {
      const socket = this.options.socketFactory
        ? this.options.socketFactory(url)
        : (new WebSocket(url) as unknown as SocketLike);
      this.socket = socket;
      this.bind(socket);
    } catch (error) {
      this.log.error("socket construction failed", error);
      this.scheduleReconnect();
    }
    // Opening is event-driven; callers wait on ServerEvent.Connected, not this.
    return Promise.resolve();
  }

  private bind(socket: SocketLike): void {
    // Native WebSocket path.
    if (typeof socket.addEventListener === "function") {
      socket.addEventListener("open", () => this.handleOpen());
      socket.addEventListener("message", (event) => {
        const data: unknown = (event as MessageEvent).data;
        this.handleMessage(typeof data === "string" ? data : "");
      });
      socket.addEventListener("close", () => this.handleClose("socket_closed"));
      socket.addEventListener("error", () => this.log.warn("socket error"));
      return;
    }

    // Socket.IO path.
    if (typeof socket.on === "function") {
      socket.on("connect", () => this.handleOpen());
      socket.on("message", (...args: unknown[]) => {
        const first = args[0];
        this.handleMessage(typeof first === "string" ? first : JSON.stringify(first));
      });
      socket.on("disconnect", (...args: unknown[]) => this.handleClose(describeReason(args[0])));
      return;
    }

    this.log.error("unsupported socket implementation");
  }

  private handleOpen(): void {
    this.state = ConnectionState.Open;
    this.attempts = 0;
    this.log.info("connected");
    // Flush anything queued while offline, oldest first.
    while (this.outbox.length > 0) {
      const envelope = this.outbox.shift()!;
      this.write(envelope);
    }
  }

  private handleMessage(raw: string): void {
    if (!raw) return;
    let envelope: Envelope;
    try {
      envelope = JSON.parse(raw) as Envelope;
    } catch {
      this.log.warn("dropped unparseable frame");
      return;
    }
    const event = envelope.event as ServerEvent;
    const bucket = this.handlers.get(event);
    if (!bucket) return;
    for (const handler of Array.from(bucket)) handler(envelope.payload);
  }

  private handleClose(reason: string): void {
    if (this.disposed) return;
    const willReconnect = this.attempts < this.options.maxReconnectAttempts;
    this.state = ConnectionState.Closed;
    this.socket = null;
    this.dispatch(ServerEvent.Disconnected, { reason, willReconnect });
    if (willReconnect) this.scheduleReconnect();
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectHandle !== null) return;
    if (this.attempts >= this.options.maxReconnectAttempts) {
      this.dispatch(ServerEvent.Error, {
        code: "RECONNECT_FAILED",
        message: "Unable to reach the table server",
        fatal: true,
      });
      return;
    }
    // Capped exponential backoff with jitter, so a server restart does not
    // produce a thundering herd of clients reconnecting in lockstep.
    const base = this.options.reconnectDelayMs * 2 ** this.attempts;
    const wait = Math.min(base, 30_000) * (0.75 + Math.random() * 0.5);
    this.attempts += 1;
    this.state = ConnectionState.Reconnecting;
    this.reconnectHandle = setTimeout(() => {
      this.reconnectHandle = null;
      void this.connect();
    }, wait);
  }

  send<K extends ClientEvent>(event: K, payload: ClientEventMap[K]): void {
    const envelope: Envelope = { event: event, payload };
    if (this.state !== ConnectionState.Open || !this.socket) {
      this.outbox.push(envelope);
      return;
    }
    this.write(envelope);
  }

  private write(envelope: Envelope): void {
    const socket = this.socket;
    if (!socket) return;
    try {
      if (typeof socket.emit === "function") socket.emit("message", envelope);
      else socket.send(JSON.stringify(envelope));
    } catch (error) {
      this.log.warn("send failed, buffering", error);
      this.outbox.push(envelope);
    }
  }

  on<K extends ServerEvent>(event: K, handler: ServerEventHandler<K>): () => void {
    let bucket = this.handlers.get(event);
    if (!bucket) {
      bucket = new Set();
      this.handlers.set(event, bucket);
    }
    const wrapped = handler as (payload: unknown) => void;
    bucket.add(wrapped);
    return () => {
      bucket.delete(wrapped);
    };
  }

  private dispatch<K extends ServerEvent>(event: K, payload: ServerEventMap[K]): void {
    const bucket = this.handlers.get(event);
    if (!bucket) return;
    for (const handler of Array.from(bucket)) handler(payload);
  }

  disconnect(): void {
    if (this.reconnectHandle !== null) {
      clearTimeout(this.reconnectHandle);
      this.reconnectHandle = null;
    }
    this.socket?.close();
    this.socket = null;
    this.state = ConnectionState.Closed;
  }

  destroy(): void {
    this.disposed = true;
    this.disconnect();
    this.handlers.clear();
    this.outbox.length = 0;
  }
}

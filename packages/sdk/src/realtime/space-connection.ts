// ============================================================================
// SpaceConnection — real-time Socket.io connection to a Director space
// ============================================================================

import { io, Socket } from "socket.io-client";

// ---- Event payload types ---------------------------------------------------

export interface SpaceInitEvent {
  state: any;
}

export interface ChatResponseEvent {
  message: string;
}

export interface PlanCreatedEvent {
  plan: {
    id: string;
    goal: string;
    steps: PlanStepEvent[];
  };
}

export interface PlanStepEvent {
  stepId: string;
  description: string;
  status: "running" | "done" | "error";
}

export type JsonPatch = {
  op: "add" | "remove" | "replace" | "move" | "copy" | "test";
  path: string;
  value?: any;
};

export interface PatchEvent {
  patches: JsonPatch[];
}

// ---- Event map -------------------------------------------------------------

export interface SpaceEventMap {
  connect: () => void;
  disconnect: (reason: string) => void;
  error: (err: { code: string; message: string }) => void;
  init: (event: SpaceInitEvent) => void;
  "chat.response": (event: ChatResponseEvent) => void;
  "plan.created": (event: PlanCreatedEvent) => void;
  "plan.step": (event: PlanStepEvent) => void;
  patch: (event: PatchEvent) => void;
}

type Listener<T extends (...args: any[]) => void> = T;

// ---- SpaceConnection -------------------------------------------------------

export interface SpaceConnectionOptions {
  /** WebSocket server URL, e.g. "ws://localhost:4000" */
  wsUrl: string;
  /** JWT or API token forwarded as a WS handshake query param */
  token?: string;
}

export class SpaceConnection {
  private socket: Socket;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();

  constructor(
    public readonly spaceId: string,
    options: SpaceConnectionOptions,
  ) {
    this.socket = io(options.wsUrl, {
      path: "/ws",
      query: {
        spaceId,
        ...(options.token ? { token: options.token } : {}),
      },
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
    });

    // Map raw socket events to typed SDK events
    this.socket.on("connect", () => this._emit("connect"));
    this.socket.on("disconnect", (reason: string) => this._emit("disconnect", reason));
    this.socket.on("error", (err: any) => this._emit("error", err));

    this.socket.on("message", (data: any) => {
      switch (data.type) {
        case "init":
          this._emit("init", { state: data.state } satisfies SpaceInitEvent);
          break;
        case "chat.response":
          this._emit("chat.response", { message: data.message } satisfies ChatResponseEvent);
          break;
        case "plan.created":
          this._emit("plan.created", { plan: data.plan } satisfies PlanCreatedEvent);
          break;
        case "plan.step":
          this._emit("plan.step", {
            stepId: data.stepId,
            description: data.description,
            status: data.status,
          } satisfies PlanStepEvent);
          break;
        case "patch": {
          const patches = Array.isArray(data.patch) ? data.patch : [data.patch];
          this._emit("patch", { patches } satisfies PatchEvent);
          break;
        }
      }
    });
  }

  // ---- Event emitter -------------------------------------------------------

  on<K extends keyof SpaceEventMap>(event: K, listener: Listener<SpaceEventMap[K]>): this {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener as any);
    return this;
  }

  off<K extends keyof SpaceEventMap>(event: K, listener: Listener<SpaceEventMap[K]>): this {
    this.listeners.get(event)?.delete(listener as any);
    return this;
  }

  once<K extends keyof SpaceEventMap>(event: K, listener: Listener<SpaceEventMap[K]>): this {
    const wrapper = (...args: any[]) => {
      this.off(event, wrapper as any);
      (listener as any)(...args);
    };
    return this.on(event, wrapper as any);
  }

  private _emit(event: string, ...args: any[]): void {
    this.listeners.get(event)?.forEach((fn) => fn(...args));
  }

  // ---- Send actions --------------------------------------------------------

  get connected(): boolean {
    return this.socket.connected;
  }

  sendChat(message: string): void {
    this.socket.emit("chat", { message });
  }

  sendPatch(patches: JsonPatch[]): void {
    this.socket.emit("patch", { patch: patches });
  }

  confirmPlan(planId: string): void {
    this.socket.emit("plan.confirm", { planId });
  }

  rejectPlan(planId: string): void {
    this.socket.emit("plan.reject", { planId });
  }

  disconnect(): void {
    this.socket.disconnect();
    this.listeners.clear();
  }
}

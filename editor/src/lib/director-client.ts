import { Patch } from "@openvideo/core";
import { Plan } from "../../../services/director/src/types/plan.types";
import { WsServerMessage, WsClientMessage } from "../../../services/director/src/types/ws.types";
import { projectStore } from "@/lib/project";

export class DirectorClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private projectId: string;
  private token: string;

  constructor(projectId: string, token: string) {
    this.projectId = projectId;
    this.token = token;
  }

  connect() {
    if (this.ws) return;

    // In a real app this URL would come from env config
    const url = `ws://localhost:4000/ws?projectId=${this.projectId}&token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log("Connected to Director service");
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data);
        this.handleMessage(msg);
      } catch (e) {
        console.error("Failed to parse WS message", e);
      }
    };

    this.ws.onclose = () => {
      console.log("Disconnected from Director service");
      this.ws = null;
      // Auto-reconnect logic could go here
    };
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(
    event: "chat.chunk" | "plan.created" | "plan.step" | "plan.complete" | "error",
    callback: (data: any) => void,
  ) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)!.delete(callback);
  }

  private emit(event: string, data: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }

  private handleMessage(msg: WsServerMessage) {
    switch (msg.type) {
      case "patch":
        // Apply remote patches silently to the core store
        projectStore.getState().applyPatch(msg.patch);
        break;
      case "chat.chunk":
        this.emit("chat.chunk", msg);
        break;
      case "plan.created":
        this.emit("plan.created", msg.plan);
        break;
      case "plan.step":
        this.emit("plan.step", msg);
        break;
      case "plan.complete":
        this.emit("plan.complete", msg.planId);
        break;
      case "error":
        this.emit("error", msg);
        break;
    }
  }

  sendChat(sessionId: string, message: string) {
    this.send({ type: "chat", sessionId, message });
  }

  confirmPlan(planId: string) {
    this.send({ type: "plan.confirm", planId });
  }

  rejectPlan(planId: string) {
    this.send({ type: "plan.reject", planId });
  }

  private send(msg: WsClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  // HTTP endpoints
  async syncProject() {
    // In a real app we'd use a configured HTTP client with auth
    await fetch("http://localhost:4000/project/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ projectId: this.projectId }),
    });
  }

  async getUploadUrl(filename: string, contentType: string) {
    const res = await fetch("http://localhost:4000/assets/upload-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ projectId: this.projectId, filename, contentType }),
    });
    return res.json();
  }
}

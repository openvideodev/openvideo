import { Injectable, Logger } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { WsServerMessage } from "../types/ws.types";

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);
  private server: Server;

  /**
   * Called by DirectorGateway.afterInit() once the Socket.io server is ready.
   */
  setServer(server: Server): void {
    this.server = server;
  }

  /**
   * Emit a message to all clients in a project room, optionally excluding the
   * sender (pass the sending Socket to broadcast only to *other* members).
   */
  broadcast(projectId: string, message: WsServerMessage, exclude?: Socket): void {
    if (!this.server) {
      this.logger.warn("Socket.io server not yet initialised — cannot broadcast");
      return;
    }

    if (exclude) {
      // Emit to everyone in the room except the sender
      exclude.to(projectId).emit("message", message);
    } else {
      this.server.to(projectId).emit("message", message);
    }
  }

  /**
   * Send a message directly to a single connected client.
   */
  send(client: Socket, message: WsServerMessage): void {
    client.emit("message", message);
  }
}

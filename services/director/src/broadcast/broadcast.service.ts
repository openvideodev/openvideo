import { Injectable, Logger } from '@nestjs/common';
import { WebSocket } from 'ws';
import { WsServerMessage } from '../types/ws.types';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  // Maps projectId -> Set of WebSocket connections
  private projectConnections = new Map<string, Set<WebSocket>>();

  // Reverse map for faster disconnect cleanup
  private connectionProjects = new Map<WebSocket, string>();

  addConnection(client: WebSocket, projectId: string) {
    if (!this.projectConnections.has(projectId)) {
      this.projectConnections.set(projectId, new Set());
    }
    this.projectConnections.get(projectId)!.add(client);
    this.connectionProjects.set(client, projectId);
  }

  removeConnection(client: WebSocket): string | undefined {
    const projectId = this.connectionProjects.get(client);
    if (projectId) {
      const connections = this.projectConnections.get(projectId);
      if (connections) {
        connections.delete(client);
        if (connections.size === 0) {
          this.projectConnections.delete(projectId);
        }
      }
      this.connectionProjects.delete(client);
    }
    return projectId;
  }

  getProjectId(client: WebSocket): string | undefined {
    return this.connectionProjects.get(client);
  }

  broadcast(projectId: string, message: WsServerMessage) {
    const connections = this.projectConnections.get(projectId);
    if (connections) {
      const data = JSON.stringify(message);
      connections.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  }

  send(client: WebSocket, message: WsServerMessage) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }
}

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { UseGuards, Logger, Inject } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { JwtGuard } from '../auth/jwt.guard';
import { CoreRegistryService } from '../core/core-registry.service';
import { WsServerMessage, WsClientMessage } from '../types/ws.types';
import { DirectorService } from '../director/director.service';
import { BroadcastService } from '../broadcast/broadcast.service';

@WebSocketGateway({ path: '/ws' })
export class DirectorGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DirectorGateway.name);
  
  constructor(
    private coreRegistry: CoreRegistryService,
    private directorService: DirectorService,
    private broadcastService: BroadcastService,
  ) {}

  // @UseGuards(JwtGuard)
  async handleConnection(client: WebSocket, request: any) {
    const projectId = new URL(request.url, 'http://localhost').searchParams.get('projectId');
    
    if (!projectId) {
      client.close(1008, 'Missing projectId');
      return;
    }

    this.logger.log(`Client connected to project ${projectId}`);
    
    this.broadcastService.addConnection(client, projectId);

    // Ensure the ServerCore is loaded
    const core = await this.coreRegistry.get(projectId);
    
    // Subscribe to patch events if we're the first connection for this project
    // In a real implementation, we might want to check if it's already subscribed.
    // For now, we'll assume ServerCore.onPatch returns an unsubscribe and we manage it.
    // Actually, ServerCore currently emits to all listeners. We just need one listener 
    // per project that broadcasts to all sockets in that project.
    if (!Reflect.getMetadata('hasPatchListener', core)) {
      Reflect.defineMetadata('hasPatchListener', true, core);
      core.onPatch((patches) => {
        this.broadcastService.broadcast(projectId, { type: 'patch', patch: patches });
      });
    }
  }

  handleDisconnect(client: WebSocket) {
    const projectId = this.broadcastService.removeConnection(client);
    if (projectId) {
      this.logger.log(`Client disconnected from project ${projectId}`);
    }
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage('chat')
  async handleChat(
    @MessageBody() message: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const projectId = this.broadcastService.getProjectId(client);
    if (!projectId) return;
    
    // In a real app we'd get userId from request.user (set by JwtGuard)
    // For now we'll mock userId for simplicity or pass it in message
    const userId = 'user_1';

    this.logger.log(`Received chat in project ${projectId}: ${message.message}`);
    await this.directorService.handleUserRequest(projectId, userId, message.message);
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage('plan.confirm')
  async handlePlanConfirm(
    @MessageBody() message: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const projectId = this.broadcastService.getProjectId(client);
    if (!projectId) return;
    const userId = 'user_1';

    await this.directorService.handlePlanConfirmation(projectId, userId, message.planId);
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage('plan.reject')
  async handlePlanReject(
    @MessageBody() message: any,
    @ConnectedSocket() client: WebSocket,
  ) {
    const projectId = this.broadcastService.getProjectId(client);
    if (!projectId) return;
    const userId = 'user_1';

    await this.directorService.handlePlanRejection(projectId, userId, message.planId);
  }

}

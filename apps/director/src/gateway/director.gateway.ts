import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Logger, UnauthorizedException } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { CoreRegistryService } from "../core/core-registry.service";
import { DirectorService } from "../director/director.service";
import { BroadcastService } from "../broadcast/broadcast.service";
import { JwtService } from "@nestjs/jwt";
import { ApiTokenService } from "../auth/api-token.service";

@WebSocketGateway({ path: "/ws", cors: { origin: "*" } })
export class DirectorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(DirectorGateway.name);

  constructor(
    private coreRegistry: CoreRegistryService,
    private directorService: DirectorService,
    private broadcastService: BroadcastService,
    private jwtService: JwtService,
    private apiTokenService: ApiTokenService,
  ) {}

  private async extractUserFromSocket(
    client: Socket,
  ): Promise<{ userId: string; orgId?: string } | null> {
    // Development bypass - allow connection without token
    if (process.env.NODE_ENV !== "production") {
      const devUserId = client.handshake.query.userId as string;
      if (devUserId) {
        return { userId: devUserId, orgId: client.handshake.query.orgId as string };
      }
      // Default dev user
      return { userId: "dev_user_1" };
    }

    const token = (client.handshake.query.token as string) || client.handshake.auth?.token;
    if (!token) return null;

    // API token (ov_live_*)
    if (token.startsWith("ov_live_")) {
      const result = await this.apiTokenService.validateToken(token);
      if (result.valid && result.userId) {
        return { userId: result.userId };
      }
      this.logger.warn(`Invalid API token for WS connection`);
      return null;
    }

    // JWT
    try {
      const payload = this.jwtService.verify(token) as any;
      return {
        userId: payload.sub || payload.userId,
        orgId: payload.orgId,
      };
    } catch (err: any) {
      this.logger.warn(`Invalid WebSocket token: ${err.message}`);
      return null;
    }
  }

  afterInit(server: Server) {
    this.broadcastService.setServer(server);
    this.logger.log("Socket.io gateway initialised");
  }

  // @UseGuards(JwtGuard)
  async handleConnection(client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;

    if (!spaceId) {
      client.disconnect(true);
      return;
    }

    // Extract and validate user
    const user = await this.extractUserFromSocket(client);
    if (!user) {
      this.logger.warn(`Client ${client.id} rejected - invalid or missing token`);
      client.emit("error", {
        code: "UNAUTHORIZED",
        message: "Invalid or missing authentication token",
      });
      client.disconnect(true);
      return;
    }

    // Store user context on socket for later use
    (client as any).user = user;

    this.logger.log(`Client ${client.id} (user: ${user.userId}) connected to space ${spaceId}`);

    // Join the space room — Socket.io tracks membership automatically
    await client.join(spaceId);

    // Ensure the ServerCore is loaded and send initial snapshot
    const core = await this.coreRegistry.get(spaceId);
    client.emit("message", { type: "init", state: core.getSnapshot() });

    // Register a single patch listener per space that fans out to all room members
    if (!Reflect.getMetadata("hasPatchListener", core)) {
      Reflect.defineMetadata("hasPatchListener", true, core);
      core.onPatch((patches) => {
        this.broadcastService.broadcast(spaceId, { type: "patch", patch: patches });
      });
    }
  }

  handleDisconnect(client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;
    if (spaceId) {
      this.logger.log(`Client ${client.id} disconnected from space ${spaceId}`);
    }
    // No manual cleanup needed — Socket.io removes the client from all rooms on disconnect
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage("chat")
  async handleChat(@MessageBody() message: any, @ConnectedSocket() client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;
    if (!spaceId) return;

    const user = (client as any).user as { userId: string; orgId?: string };
    if (!user) {
      client.emit("error", { code: "UNAUTHORIZED", message: "User context not found" });
      return;
    }

    this.logger.log(`Received chat in space ${spaceId} from ${user.userId}: ${message.message}`);
    await this.directorService.handleUserRequest(spaceId, user.userId, message.message);
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage("plan.confirm")
  async handlePlanConfirm(@MessageBody() message: any, @ConnectedSocket() client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;
    if (!spaceId) return;

    const user = (client as any).user as { userId: string; orgId?: string };
    if (!user) return;

    await this.directorService.handlePlanConfirmation(spaceId, user.userId, message.planId);
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage("plan.reject")
  async handlePlanReject(@MessageBody() message: any, @ConnectedSocket() client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;
    if (!spaceId) return;

    const user = (client as any).user as { userId: string; orgId?: string };
    if (!user) return;

    await this.directorService.handlePlanRejection(spaceId, user.userId, message.planId);
  }

  // @UseGuards(JwtGuard)
  @SubscribeMessage("patch")
  async handlePatch(@MessageBody() message: { patch: any[] }, @ConnectedSocket() client: Socket) {
    const spaceId = client.handshake.query.spaceId as string;
    if (!spaceId) return;

    this.logger.log(`Received patches for space ${spaceId}`);
    const core = await this.coreRegistry.get(spaceId);

    // Apply patches to the server-side core
    core.applyPatch(message.patch);

    // Broadcast to OTHER clients in the same room (exclude sender)
    this.broadcastService.broadcast(spaceId, { type: "patch", patch: message.patch }, client);
  }
}

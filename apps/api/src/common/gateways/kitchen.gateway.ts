import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@omniops/shared';

export interface KitchenQueueItem {
  orderId: string;
  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  guestCount?: number;
  itemId: string;
  itemName: string;
  quantity: number;
  modifiers: string[];
  notes: string | null;
  status: string;
  elapsedSeconds: number;
  priority: boolean;
  createdAt: string;
}

export interface OrderNewPayload {
  orderId: string;
  orderNumber: string;
  orderType: string;
  tableNumber: string | null;
  guestCount: number;
  items: KitchenQueueItem[];
}

export interface OrderUpdatedPayload {
  orderId: string;
  status: string;
  items: KitchenQueueItem[];
}

export interface OrderBumpPayload {
  orderId: string;
  itemId: string;
}

@WebSocketGateway({
  namespace: '/kitchen',
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
})
export class KitchenGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(KitchenGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
      });

      // Validate user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status !== 'ACTIVE') {
        this.logger.warn(`Client ${client.id} has invalid or inactive user`);
        client.disconnect(true);
        return;
      }

      // Determine siteId: prefer client query param, then user's assigned site
      const querySiteId = client.handshake.query.siteId as string | undefined;
      const siteId = querySiteId ?? user.siteId;

      if (!siteId) {
        this.logger.warn(`Client ${client.id} has no site context`);
        client.disconnect(true);
        return;
      }

      // Verify user has access to this site
      const site = await this.prisma.site.findFirst({
        where: { id: siteId },
      });
      if (!site) {
        this.logger.warn(`Client ${client.id} attempted connection to non-existent site ${siteId}`);
        client.disconnect(true);
        return;
      }

      // Tenant-scoping: non-super-admin can only access their tenant's sites
      if (user.role !== Role.SUPER_ADMIN && user.tenantId && site.tenantId !== user.tenantId) {
        this.logger.warn(`Client ${client.id} attempted cross-tenant access`);
        client.disconnect(true);
        return;
      }

      // Attach auth data to socket
      (client as any).user = {
        sub: user.id,
        tenantId: user.tenantId,
        role: user.role as Role,
        siteId,
        email: user.email,
      };

      const room = `site:${siteId}`;
      await client.join(room);
      this.logger.log(`Client ${client.id} joined ${room} (user: ${user.email})`);
    } catch (err) {
      this.logger.warn(`Client ${client.id} auth failed: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    const user = (client as any).user;
    if (user?.siteId) {
      const room = `site:${user.siteId}`;
      client.leave(room);
      this.logger.log(`Client ${client.id} left ${room}`);
    }
  }

  @SubscribeMessage('order:bump')
  async handleOrderBump(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: OrderBumpPayload,
  ): Promise<void> {
    const user = (client as any).user;
    if (!user || !user.siteId) {
      return;
    }

    try {
      // Update the order item status to READY
      const item = await this.prisma.orderItem.findFirst({
        where: { id: data.itemId, orderId: data.orderId },
        include: { order: true },
      });

      if (!item || item.order.siteId !== user.siteId) {
        this.logger.warn(`Bump attempt on invalid item ${data.itemId} by ${user.email}`);
        return;
      }

      if (item.status === 'CANCELLED' || item.status === 'READY' || item.status === 'SERVED') {
        return; // Already bumped
      }

      await this.prisma.orderItem.update({
        where: { id: data.itemId },
        data: { status: 'READY', completedAt: new Date() },
      });

      this.logger.log(`Item ${data.itemId} bumped to READY by ${user.email}`);

      // Emit update to the site room
      this.server.to(`site:${user.siteId}`).emit('order:updated', {
        orderId: data.orderId,
        itemId: data.itemId,
        status: 'READY',
      });
    } catch (err) {
      this.logger.error(`Bump error: ${(err as Error).message}`);
    }
  }

  // Public methods for OrdersService to call
  emitOrderNew(siteId: string, payload: OrderNewPayload): void {
    this.server.to(`site:${siteId}`).emit('order:new', payload);
  }

  emitOrderUpdated(siteId: string, payload: OrderUpdatedPayload): void {
    this.server.to(`site:${siteId}`).emit('order:updated', payload);
  }

  private extractToken(client: Socket): string | null {
    // Try auth header first (handshake headers)
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Fall back to query param
    const queryToken = client.handshake.query.token as string | undefined;
    if (queryToken) {
      return queryToken;
    }
    return null;
  }
}

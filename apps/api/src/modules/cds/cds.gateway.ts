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

export interface CdsOrderUpdatedPayload {
  orderId: string;
  status?: string;
  items?: Array<{
    itemId: string;
    name: string;
    qty: number;
    status: string;
    unitPrice: number;
    total: number;
    modifiers: string[];
  }>;
}

export interface CdsItemStatusPayload {
  orderId: string;
  itemId: string;
  itemName: string;
  status: string;
}

@WebSocketGateway({
  namespace: '/cds',
  cors: {
    origin: ['http://localhost:3001', 'http://localhost:3000'],
    credentials: true,
  },
})
export class CdsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(CdsGateway.name);

  handleConnection(client: Socket): void {
    const orderId = client.handshake.query.orderId as string | undefined;
    this.logger.log(`CDS client ${client.id} connected${orderId ? ` for order ${orderId}` : ''}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`CDS client ${client.id} disconnected`);
  }

  @SubscribeMessage('join')
  handleJoinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ): void {
    if (data?.orderId) {
      const room = `cds:order:${data.orderId}`;
      client.join(room);
      this.logger.log(`CDS client ${client.id} joined ${room}`);
    }
  }

  @SubscribeMessage('leave')
  handleLeaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { orderId: string },
  ): void {
    if (data?.orderId) {
      const room = `cds:order:${data.orderId}`;
      client.leave(room);
      this.logger.log(`CDS client ${client.id} left ${room}`);
    }
  }

  // Public methods for OrdersService to call
  emitOrderUpdated(orderId: string, payload: CdsOrderUpdatedPayload): void {
    const room = `cds:order:${orderId}`;
    this.server.to(room).emit('order:updated', payload);
    this.logger.log(`Emitted order:updated to ${room}`);
  }

  emitItemStatus(orderId: string, payload: CdsItemStatusPayload): void {
    const room = `cds:order:${orderId}`;
    this.server.to(room).emit('item:status', payload);
    this.logger.log(`Emitted item:status to ${room}`);
  }
}

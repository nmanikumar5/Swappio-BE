import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import Message from '../models/Message';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

export const initializeSocket = (httpServer: HTTPServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token;

    // Log handshake info for debugging (avoid logging token itself)
    // eslint-disable-next-line no-console
    // console.log(`[SOCKET] handshake auth keys: ${Object.keys(socket.handshake.auth || {}).join(',')}`);

    if (!token) {
      // eslint-disable-next-line no-console
      // console.error('[SOCKET] Authentication error: No token provided in handshake for socket id', socket.id);
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
      socket.userId = decoded.id;
      next();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[SOCKET] Authentication error: Invalid token for socket id', socket.id, String((error as any)?.message || error));
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User connected: ${socket.userId}`);

    // Join user's own room
    if (socket.userId) {
      socket.join(socket.userId);
    }

    // Handle sending messages
    socket.on('send_message', async (data: {
      receiverId: string;
      text: string;
      listingId?: string;
    }) => {
      try {
        if (!socket.userId) return;

        const message = await Message.create({
          senderId: socket.userId,
          receiverId: data.receiverId,
          text: data.text,
          listingId: data.listingId,
        });

        const populatedMessage = await Message.findById(message._id)
          .populate('senderId', 'name photo')
          .populate('receiverId', 'name photo');

        // Check if receiver is currently connected (in their room)
        try {
          const sockets = await io.in(data.receiverId).fetchSockets();
          if (sockets && sockets.length > 0) {
            // mark as delivered
            message.isDelivered = true as any;
            message.deliveredAt = new Date();
            await message.save();
            // re-populate with delivered flag
            const deliveredPopulated = await Message.findById(message._id)
              .populate('senderId', 'name photo')
              .populate('receiverId', 'name photo');
            // Emit to receiver
            io.to(data.receiverId).emit('receive_message', deliveredPopulated);

            // Notify sender that message was delivered
            io.to(socket.userId as string).emit('message_delivered', {
              messageId: String(message._id),
              deliveredAt: message.deliveredAt?.toISOString(),
            });

            // Emit back to sender for confirmation (with delivered flag)
            socket.emit('message_sent', deliveredPopulated);
          } else {
            // receiver not connected yet: emit normally
            io.to(data.receiverId).emit('receive_message', populatedMessage);
            socket.emit('message_sent', populatedMessage);
          }
        } catch (err) {
          // fallback: just emit as-is
          io.to(data.receiverId).emit('receive_message', populatedMessage);
          socket.emit('message_sent', populatedMessage);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('typing', (data: { receiverId: string }) => {
      io.to(data.receiverId).emit('user_typing', {
        userId: socket.userId,
      });
    });

    // Handle stop typing
    socket.on('stop_typing', (data: { receiverId: string }) => {
      io.to(data.receiverId).emit('user_stop_typing', {
        userId: socket.userId,
      });
    });

    // Handle marking messages as read
    socket.on('mark_read', async (data: { senderId: string }) => {
      try {
        if (!socket.userId) return;

        await Message.updateMany(
          {
            senderId: data.senderId,
            receiverId: socket.userId,
            isRead: false,
          },
          { isRead: true }
        );

        io.to(data.senderId).emit('messages_read', {
          readBy: socket.userId,
        });
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

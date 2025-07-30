import { Server as SocketIOServer } from 'socket.io';
import { AuthenticatedSocket } from '../middleware/auth';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';

export const setupSocketHandlers = (io: SocketIOServer) => {
  io.on('connection', async (socket: AuthenticatedSocket) => {
    const user = socket.user!;
    logger.info(`User connected: ${user.username} (${socket.id})`);

    // Update user status to online
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ONLINE' }
    });

    // Get user's workspaces and join rooms
    const userWorkspaces = await prisma.workspaceMember.findMany({
      where: { userId: user.id },
      include: {
        workspace: {
          include: {
            channels: {
              where: {
                OR: [
                  { type: 'PUBLIC' },
                  {
                    members: {
                      some: {
                        userId: user.id
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      }
    });

    // Join workspace and channel rooms
    for (const membership of userWorkspaces) {
      socket.join(`workspace:${membership.workspaceId}`);
      
      for (const channel of membership.workspace.channels) {
        socket.join(`channel:${channel.id}`);
      }
    }

    // Get user's direct messages and join rooms
    const directMessages = await prisma.directMessage.findMany({
      where: {
        participants: {
          some: {
            id: user.id
          }
        }
      }
    });

    for (const dm of directMessages) {
      socket.join(`dm:${dm.id}`);
    }

    // Notify other users that this user is online
    for (const membership of userWorkspaces) {
      socket.to(`workspace:${membership.workspaceId}`).emit('user_status_changed', {
        userId: user.id,
        status: 'ONLINE'
      });
    }

    // Handle joining a channel
    socket.on('join_channel', async (data: { channelId: string }) => {
      try {
        // Verify user has access to channel
        const channelMember = await prisma.channelMember.findFirst({
          where: {
            userId: user.id,
            channelId: data.channelId
          }
        });

        if (!channelMember) {
          socket.emit('error', { message: 'Access denied to channel' });
          return;
        }

        socket.join(`channel:${data.channelId}`);
        socket.emit('channel_joined', { channelId: data.channelId });
        
        logger.info(`User ${user.username} joined channel room ${data.channelId}`);
      } catch (error) {
        logger.error('Error joining channel:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle leaving a channel
    socket.on('leave_channel', (data: { channelId: string }) => {
      socket.leave(`channel:${data.channelId}`);
      socket.emit('channel_left', { channelId: data.channelId });
      
      logger.info(`User ${user.username} left channel room ${data.channelId}`);
    });

    // Handle joining a direct message
    socket.on('join_dm', async (data: { dmId: string }) => {
      try {
        // Verify user is participant in DM
        const dm = await prisma.directMessage.findFirst({
          where: {
            id: data.dmId,
            participants: {
              some: {
                id: user.id
              }
            }
          }
        });

        if (!dm) {
          socket.emit('error', { message: 'Access denied to direct message' });
          return;
        }

        socket.join(`dm:${data.dmId}`);
        socket.emit('dm_joined', { dmId: data.dmId });
        
        logger.info(`User ${user.username} joined DM room ${data.dmId}`);
      } catch (error) {
        logger.error('Error joining DM:', error);
        socket.emit('error', { message: 'Failed to join direct message' });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data: { channelId?: string; dmId?: string }) => {
      const room = data.channelId ? `channel:${data.channelId}` : `dm:${data.dmId}`;
      socket.to(room).emit('user_typing', {
        userId: user.id,
        username: user.username,
        channelId: data.channelId,
        dmId: data.dmId
      });
    });

    socket.on('typing_stop', (data: { channelId?: string; dmId?: string }) => {
      const room = data.channelId ? `channel:${data.channelId}` : `dm:${data.dmId}`;
      socket.to(room).emit('user_stopped_typing', {
        userId: user.id,
        username: user.username,
        channelId: data.channelId,
        dmId: data.dmId
      });
    });

    // Handle status updates
    socket.on('update_status', async (data: { status: string; customStatus?: string }) => {
      try {
        const validStatuses = ['ONLINE', 'AWAY', 'DO_NOT_DISTURB', 'OFFLINE'];
        if (!validStatuses.includes(data.status)) {
          socket.emit('error', { message: 'Invalid status' });
          return;
        }

        await prisma.user.update({
          where: { id: user.id },
          data: {
            status: data.status as any,
            customStatus: data.customStatus || null
          }
        });

        // Broadcast status change to all workspaces user is in
        for (const membership of userWorkspaces) {
          io.to(`workspace:${membership.workspaceId}`).emit('user_status_changed', {
            userId: user.id,
            status: data.status,
            customStatus: data.customStatus
          });
        }

        logger.info(`User ${user.username} updated status to ${data.status}`);
      } catch (error) {
        logger.error('Error updating status:', error);
        socket.emit('error', { message: 'Failed to update status' });
      }
    });

    // Handle voice/video call events
    socket.on('call_start', async (data: { channelId: string; type: 'VOICE' | 'VIDEO' }) => {
      try {
        // Verify user has access to channel
        const channelMember = await prisma.channelMember.findFirst({
          where: {
            userId: user.id,
            channelId: data.channelId
          }
        });

        if (!channelMember) {
          socket.emit('error', { message: 'Access denied to channel' });
          return;
        }

        const call = await prisma.call.create({
          data: {
            type: data.type,
            channelId: data.channelId,
            startedById: user.id,
            participants: {
              connect: [{ id: user.id }]
            }
          },
          include: {
            participants: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                avatar: true
              }
            }
          }
        });

        // Notify channel members about call
        socket.to(`channel:${data.channelId}`).emit('call_started', {
          call,
          startedBy: {
            id: user.id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar
          }
        });

        socket.emit('call_created', { call });
        
        logger.info(`Call started by ${user.username} in channel ${data.channelId}`);
      } catch (error) {
        logger.error('Error starting call:', error);
        socket.emit('error', { message: 'Failed to start call' });
      }
    });

    socket.on('call_join', async (data: { callId: string }) => {
      try {
        const call = await prisma.call.findUnique({
          where: { id: data.callId },
          include: {
            participants: true
          }
        });

        if (!call || call.status !== 'ACTIVE') {
          socket.emit('error', { message: 'Call not found or not active' });
          return;
        }

        // Add user to call participants
        await prisma.call.update({
          where: { id: data.callId },
          data: {
            participants: {
              connect: [{ id: user.id }]
            }
          }
        });

        // Join call room
        socket.join(`call:${data.callId}`);

        // Notify other participants
        socket.to(`call:${data.callId}`).emit('user_joined_call', {
          userId: user.id,
          username: user.username,
          avatar: user.avatar
        });

        socket.emit('call_joined', { callId: data.callId });
        
        logger.info(`User ${user.username} joined call ${data.callId}`);
      } catch (error) {
        logger.error('Error joining call:', error);
        socket.emit('error', { message: 'Failed to join call' });
      }
    });

    socket.on('call_leave', async (data: { callId: string }) => {
      try {
        await prisma.call.update({
          where: { id: data.callId },
          data: {
            participants: {
              disconnect: [{ id: user.id }]
            }
          }
        });

        socket.leave(`call:${data.callId}`);

        // Notify other participants
        socket.to(`call:${data.callId}`).emit('user_left_call', {
          userId: user.id,
          username: user.username
        });

        socket.emit('call_left', { callId: data.callId });
        
        logger.info(`User ${user.username} left call ${data.callId}`);
      } catch (error) {
        logger.error('Error leaving call:', error);
        socket.emit('error', { message: 'Failed to leave call' });
      }
    });

    // Handle WebRTC signaling for voice/video calls
    socket.on('webrtc_offer', (data: { callId: string; offer: any; targetUserId: string }) => {
      socket.to(`call:${data.callId}`).emit('webrtc_offer', {
        offer: data.offer,
        fromUserId: user.id,
        targetUserId: data.targetUserId
      });
    });

    socket.on('webrtc_answer', (data: { callId: string; answer: any; targetUserId: string }) => {
      socket.to(`call:${data.callId}`).emit('webrtc_answer', {
        answer: data.answer,
        fromUserId: user.id,
        targetUserId: data.targetUserId
      });
    });

    socket.on('webrtc_ice_candidate', (data: { callId: string; candidate: any; targetUserId: string }) => {
      socket.to(`call:${data.callId}`).emit('webrtc_ice_candidate', {
        candidate: data.candidate,
        fromUserId: user.id,
        targetUserId: data.targetUserId
      });
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      logger.info(`User disconnected: ${user.username} (${socket.id})`);

      // Update user status to offline
      await prisma.user.update({
        where: { id: user.id },
        data: { status: 'OFFLINE' }
      });

      // Notify other users that this user went offline
      for (const membership of userWorkspaces) {
        socket.to(`workspace:${membership.workspaceId}`).emit('user_status_changed', {
          userId: user.id,
          status: 'OFFLINE'
        });
      }
    });
  });
};
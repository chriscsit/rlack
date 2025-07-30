import express from 'express';
import Joi from 'joi';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Create channel
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const createChannelSchema = Joi.object({
    name: Joi.string().min(1).max(50).required(),
    description: Joi.string().max(500).allow(''),
    type: Joi.string().valid('PUBLIC', 'PRIVATE').default('PUBLIC'),
    workspaceId: Joi.string().uuid().required()
  });

  const { error, value } = createChannelSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { name, description, type, workspaceId } = value;

  // Check if user is member of workspace
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: req.user!.id,
      workspaceId
    }
  });

  if (!workspaceMember) {
    throw createError('Not a member of this workspace', 403);
  }

  // Check if channel name already exists in workspace
  const existingChannel = await prisma.channel.findFirst({
    where: {
      name,
      workspaceId
    }
  });

  if (existingChannel) {
    throw createError('Channel with this name already exists', 409);
  }

  const channel = await prisma.channel.create({
    data: {
      name,
      description,
      type,
      workspaceId,
      createdById: req.user!.id,
      members: {
        create: {
          userId: req.user!.id,
          role: 'ADMIN'
        }
      }
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
              avatar: true
            }
          }
        }
      }
    }
  });

  logger.info(`Channel created: ${channel.name} in workspace ${workspaceId}`);

  res.status(201).json({
    message: 'Channel created successfully',
    channel
  });
}));

// Get channel messages
router.get('/:channelId/messages', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { channelId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  // Check if user has access to channel
  const channelMember = await prisma.channelMember.findFirst({
    where: {
      userId: req.user!.id,
      channelId
    }
  });

  if (!channelMember) {
    throw createError('Access denied to this channel', 403);
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId,
      deletedAt: null
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      reactions: {
        include: {
          user: {
            select: {
              id: true,
              username: true
            }
          }
        }
      },
      files: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit)
  });

  res.json({ messages: messages.reverse() });
}));

// Join channel
router.post('/:channelId/join', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { channelId } = req.params;

  // Check if channel exists and is public or user has access
  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    include: {
      workspace: {
        include: {
          members: {
            where: {
              userId: req.user!.id
            }
          }
        }
      }
    }
  });

  if (!channel) {
    throw createError('Channel not found', 404);
  }

  if (channel.workspace.members.length === 0) {
    throw createError('Not a member of this workspace', 403);
  }

  if (channel.type === 'PRIVATE') {
    throw createError('Cannot join private channel', 403);
  }

  // Check if already a member
  const existingMember = await prisma.channelMember.findFirst({
    where: {
      userId: req.user!.id,
      channelId
    }
  });

  if (existingMember) {
    throw createError('Already a member of this channel', 409);
  }

  await prisma.channelMember.create({
    data: {
      userId: req.user!.id,
      channelId,
      role: 'MEMBER'
    }
  });

  logger.info(`User ${req.user!.username} joined channel ${channel.name}`);

  res.json({ message: 'Joined channel successfully' });
}));

// Leave channel
router.post('/:channelId/leave', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { channelId } = req.params;

  const channelMember = await prisma.channelMember.findFirst({
    where: {
      userId: req.user!.id,
      channelId
    }
  });

  if (!channelMember) {
    throw createError('Not a member of this channel', 404);
  }

  await prisma.channelMember.delete({
    where: {
      id: channelMember.id
    }
  });

  logger.info(`User ${req.user!.username} left channel ${channelId}`);

  res.json({ message: 'Left channel successfully' });
}));

export { router as channelRoutes };
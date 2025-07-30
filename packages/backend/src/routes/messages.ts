import express from 'express';
import Joi from 'joi';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { io } from '../index';

const router = express.Router();

// Send message
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sendMessageSchema = Joi.object({
    content: Joi.string().min(1).max(4000).required(),
    channelId: Joi.string().uuid(),
    directMessageId: Joi.string().uuid(),
    threadId: Joi.string().uuid(),
    type: Joi.string().valid('TEXT', 'FILE', 'IMAGE').default('TEXT')
  }).xor('channelId', 'directMessageId');

  const { error, value } = sendMessageSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { content, channelId, directMessageId, threadId, type } = value;

  // Verify user has access to channel or DM
  if (channelId) {
    const channelMember = await prisma.channelMember.findFirst({
      where: {
        userId: req.user!.id,
        channelId
      }
    });

    if (!channelMember) {
      throw createError('Access denied to this channel', 403);
    }
  }

  if (directMessageId) {
    const dmParticipant = await prisma.directMessage.findFirst({
      where: {
        id: directMessageId,
        participants: {
          some: {
            id: req.user!.id
          }
        }
      }
    });

    if (!dmParticipant) {
      throw createError('Access denied to this direct message', 403);
    }
  }

  const message = await prisma.message.create({
    data: {
      content,
      type,
      channelId,
      directMessageId,
      threadId,
      authorId: req.user!.id
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
    }
  });

  // Emit real-time message
  if (channelId) {
    io.to(`channel:${channelId}`).emit('new_message', message);
  } else if (directMessageId) {
    io.to(`dm:${directMessageId}`).emit('new_message', message);
  }

  logger.info(`Message sent by ${req.user!.username} in ${channelId ? 'channel' : 'DM'}`);

  res.status(201).json({
    message: 'Message sent successfully',
    data: message
  });
}));

// Add reaction to message
router.post('/:messageId/reactions', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { messageId } = req.params;
  const { emoji } = req.body;

  const reactionSchema = Joi.object({
    emoji: Joi.string().min(1).max(10).required()
  });

  const { error } = reactionSchema.validate({ emoji });
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  // Check if message exists and user has access
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      channel: {
        include: {
          members: {
            where: {
              userId: req.user!.id
            }
          }
        }
      },
      directMessage: {
        include: {
          participants: {
            where: {
              id: req.user!.id
            }
          }
        }
      }
    }
  });

  if (!message) {
    throw createError('Message not found', 404);
  }

  // Check access
  const hasAccess = message.channel?.members.length > 0 || message.directMessage?.participants.length > 0;
  if (!hasAccess) {
    throw createError('Access denied', 403);
  }

  // Check if reaction already exists
  const existingReaction = await prisma.reaction.findFirst({
    where: {
      messageId,
      userId: req.user!.id,
      emoji
    }
  });

  if (existingReaction) {
    // Remove reaction
    await prisma.reaction.delete({
      where: { id: existingReaction.id }
    });

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Emit reaction update
    if (message.channelId) {
      io.to(`channel:${message.channelId}`).emit('reaction_removed', {
        messageId,
        emoji,
        userId: req.user!.id,
        reactions: updatedMessage?.reactions
      });
    }

    res.json({ message: 'Reaction removed', reactions: updatedMessage?.reactions });
  } else {
    // Add reaction
    const reaction = await prisma.reaction.create({
      data: {
        messageId,
        userId: req.user!.id,
        emoji
      },
      include: {
        user: {
          select: {
            id: true,
            username: true
          }
        }
      }
    });

    const updatedMessage = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      }
    });

    // Emit reaction update
    if (message.channelId) {
      io.to(`channel:${message.channelId}`).emit('reaction_added', {
        messageId,
        reaction,
        reactions: updatedMessage?.reactions
      });
    }

    res.json({ message: 'Reaction added', reaction, reactions: updatedMessage?.reactions });
  }
}));

// Edit message
router.patch('/:messageId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  const editSchema = Joi.object({
    content: Joi.string().min(1).max(4000).required()
  });

  const { error } = editSchema.validate({ content });
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      authorId: req.user!.id,
      deletedAt: null
    }
  });

  if (!message) {
    throw createError('Message not found or access denied', 404);
  }

  const updatedMessage = await prisma.message.update({
    where: { id: messageId },
    data: {
      content,
      editedAt: new Date()
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
    }
  });

  // Emit message update
  if (message.channelId) {
    io.to(`channel:${message.channelId}`).emit('message_updated', updatedMessage);
  }

  logger.info(`Message edited by ${req.user!.username}`);

  res.json({
    message: 'Message updated successfully',
    data: updatedMessage
  });
}));

// Delete message
router.delete('/:messageId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { messageId } = req.params;

  const message = await prisma.message.findFirst({
    where: {
      id: messageId,
      authorId: req.user!.id,
      deletedAt: null
    }
  });

  if (!message) {
    throw createError('Message not found or access denied', 404);
  }

  await prisma.message.update({
    where: { id: messageId },
    data: {
      deletedAt: new Date()
    }
  });

  // Emit message deletion
  if (message.channelId) {
    io.to(`channel:${message.channelId}`).emit('message_deleted', { messageId });
  }

  logger.info(`Message deleted by ${req.user!.username}`);

  res.json({ message: 'Message deleted successfully' });
}));

export { router as messageRoutes };
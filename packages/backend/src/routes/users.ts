import express from 'express';
import { prisma } from '../utils/database';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Search users
router.get('/search', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { q, workspaceId } = req.query;

  if (!q || typeof q !== 'string') {
    throw createError('Search query is required', 400);
  }

  const searchTerm = q.trim();
  if (searchTerm.length < 2) {
    throw createError('Search query must be at least 2 characters', 400);
  }

  let users;

  if (workspaceId) {
    // Search within workspace members
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: req.user!.id,
        workspaceId: workspaceId as string
      }
    });

    if (!workspaceMember) {
      throw createError('Access denied to this workspace', 403);
    }

    users = await prisma.user.findMany({
      where: {
        AND: [
          {
            workspaces: {
              some: {
                workspaceId: workspaceId as string
              }
            }
          },
          {
            OR: [
              {
                username: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        status: true
      },
      take: 10
    });
  } else {
    // Global search (limited for privacy)
    users = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            firstName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            lastName: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true
      },
      take: 5
    });
  }

  res.json({ users });
}));

// Get user profile
router.get('/:userId', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      status: true,
      customStatus: true,
      createdAt: true
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
}));

// Create or get direct message
router.post('/:userId/dm', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  if (userId === req.user!.id) {
    throw createError('Cannot create DM with yourself', 400);
  }

  const otherUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, firstName: true, lastName: true, avatar: true }
  });

  if (!otherUser) {
    throw createError('User not found', 404);
  }

  // Check if DM already exists
  const existingDM = await prisma.directMessage.findFirst({
    where: {
      AND: [
        {
          participants: {
            some: {
              id: req.user!.id
            }
          }
        },
        {
          participants: {
            some: {
              id: userId
            }
          }
        }
      ]
    },
    include: {
      participants: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          status: true
        }
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    }
  });

  if (existingDM) {
    return res.json({
      message: 'Direct message found',
      directMessage: existingDM
    });
  }

  // Create new DM
  const newDM = await prisma.directMessage.create({
    data: {
      participants: {
        connect: [
          { id: req.user!.id },
          { id: userId }
        ]
      }
    },
    include: {
      participants: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          status: true
        }
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  res.status(201).json({
    message: 'Direct message created',
    directMessage: newDM
  });
}));

// Get user's direct messages
router.get('/:userId/dms', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const directMessages = await prisma.directMessage.findMany({
    where: {
      participants: {
        some: {
          id: req.user!.id
        }
      }
    },
    include: {
      participants: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          status: true
        }
      },
      messages: {
        take: 1,
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          id: true,
          content: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    },
    orderBy: {
      updatedAt: 'desc'
    }
  });

  res.json({ directMessages });
}));

export { router as userRoutes };
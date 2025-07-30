import express from 'express';
import Joi from 'joi';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const createWorkspaceSchema = Joi.object({
  name: Joi.string().min(1).max(50).required(),
  slug: Joi.string().alphanum().min(3).max(30).required(),
  description: Joi.string().max(500).allow('')
});

// Create workspace
router.post('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { error, value } = createWorkspaceSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { name, slug, description } = value;

  // Check if slug is available
  const existingWorkspace = await prisma.workspace.findUnique({
    where: { slug }
  });

  if (existingWorkspace) {
    throw createError('Workspace slug already exists', 409);
  }

  // Create workspace and add user as owner
  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      description,
      members: {
        create: {
          userId: req.user!.id,
          role: 'OWNER'
        }
      },
      channels: {
        create: {
          name: 'general',
          description: 'General discussions',
          type: 'PUBLIC',
          createdById: req.user!.id,
          members: {
            create: {
              userId: req.user!.id,
              role: 'ADMIN'
            }
          }
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
              avatar: true,
              status: true
            }
          }
        }
      },
      channels: {
        include: {
          members: true
        }
      }
    }
  });

  logger.info(`New workspace created: ${workspace.name} by ${req.user!.email}`);

  res.status(201).json({
    message: 'Workspace created successfully',
    workspace
  });
}));

// Get user's workspaces
router.get('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: {
          userId: req.user!.id
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
              avatar: true,
              status: true
            }
          }
        }
      },
      channels: {
        where: {
          OR: [
            { type: 'PUBLIC' },
            {
              members: {
                some: {
                  userId: req.user!.id
                }
              }
            }
          ]
        },
        include: {
          members: true
        }
      },
      _count: {
        select: {
          members: true,
          channels: true
        }
      }
    }
  });

  res.json({ workspaces });
}));

// Get workspace by slug
router.get('/:slug', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { slug } = req.params;

  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      members: {
        some: {
          userId: req.user!.id
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
              avatar: true,
              status: true
            }
          }
        }
      },
      channels: {
        where: {
          OR: [
            { type: 'PUBLIC' },
            {
              members: {
                some: {
                  userId: req.user!.id
                }
              }
            }
          ]
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
      }
    }
  });

  if (!workspace) {
    throw createError('Workspace not found', 404);
  }

  res.json({ workspace });
}));

// Invite user to workspace
router.post('/:slug/invite', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { slug } = req.params;
  const { email, role = 'MEMBER' } = req.body;

  const inviteSchema = Joi.object({
    email: Joi.string().email().required(),
    role: Joi.string().valid('MEMBER', 'ADMIN').default('MEMBER')
  });

  const { error } = inviteSchema.validate({ email, role });
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  // Check if user has permission to invite
  const workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      members: {
        some: {
          userId: req.user!.id,
          role: {
            in: ['OWNER', 'ADMIN']
          }
        }
      }
    }
  });

  if (!workspace) {
    throw createError('Workspace not found or insufficient permissions', 404);
  }

  // Check if user is already a member
  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      workspaceId: workspace.id,
      user: {
        email
      }
    }
  });

  if (existingMember) {
    throw createError('User is already a member of this workspace', 409);
  }

  // Create or find user
  let user = await prisma.user.findUnique({
    where: { email }
  });

  if (user) {
    // Add existing user to workspace
    await prisma.workspaceMember.create({
      data: {
        userId: user.id,
        workspaceId: workspace.id,
        role
      }
    });

    logger.info(`User ${email} added to workspace ${workspace.name}`);
    res.json({ message: 'User added to workspace successfully' });
  } else {
    // Create invite for non-existing user
    const token = require('crypto').randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.workspaceInvite.create({
      data: {
        email,
        workspaceId: workspace.id,
        inviterId: req.user!.id,
        role,
        token,
        expiresAt
      }
    });

    logger.info(`Invite sent to ${email} for workspace ${workspace.name}`);
    res.json({ message: 'Invite sent successfully' });
  }
}));

export { router as workspaceRoutes };
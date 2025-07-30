import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { prisma } from '../utils/database';
import { asyncHandler } from '../middleware/errorHandler';
import Joi from 'joi';

const router = Router();

// Search validation schema
const searchSchema = Joi.object({
  query: Joi.string().required().min(1).max(100),
  type: Joi.string().valid('all', 'messages', 'files', 'users', 'channels').default('all'),
  workspaceId: Joi.string().optional(),
  channelId: Joi.string().optional(),
  userId: Joi.string().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

// Global search endpoint
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { error, value } = searchSchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }

  const {
    query,
    type,
    workspaceId,
    channelId,
    userId,
    startDate,
    endDate,
    limit,
    offset
  } = value;

  const currentUserId = req.user!.id;
  const results: any = {};

  // Get user's accessible workspaces and channels
  const userWorkspaces = await prisma.workspaceMember.findMany({
    where: { userId: currentUserId },
    select: { workspaceId: true }
  });

  const workspaceIds = userWorkspaces.map(w => w.workspaceId);

  const userChannels = await prisma.channelMember.findMany({
    where: { userId: currentUserId },
    select: { channelId: true }
  });

  const channelIds = userChannels.map(c => c.channelId);

  // Build base filters
  const baseFilters: any = {};
  if (workspaceId && workspaceIds.includes(workspaceId)) {
    baseFilters.workspaceId = workspaceId;
  }
  if (startDate || endDate) {
    baseFilters.createdAt = {};
    if (startDate) baseFilters.createdAt.gte = new Date(startDate);
    if (endDate) baseFilters.createdAt.lte = new Date(endDate);
  }

  // Search messages
  if (type === 'all' || type === 'messages') {
    const messageFilters: any = {
      OR: [
        {
          content: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ],
      AND: []
    };

    // Add workspace/channel filters
    if (channelId && channelIds.includes(channelId)) {
      messageFilters.AND.push({ channelId });
    } else {
      messageFilters.AND.push({
        OR: [
          { channelId: { in: channelIds } },
          {
            directMessage: {
              participants: {
                some: { id: currentUserId }
              }
            }
          }
        ]
      });
    }

    // Add user filter
    if (userId) {
      messageFilters.AND.push({ authorId: userId });
    }

    // Add date filters
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      messageFilters.AND.push({ createdAt: dateFilter });
    }

    const messages = await prisma.message.findMany({
      where: messageFilters,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            workspaceId: true
          }
        },
        directMessage: {
          select: {
            id: true,
            participants: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        },
        files: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            size: true
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    results.messages = messages.map(message => ({
      ...message,
      highlight: highlightText(message.content, query),
      type: 'message'
    }));
  }

  // Search files
  if (type === 'all' || type === 'files') {
    const fileFilters: any = {
      originalName: {
        contains: query,
        mode: 'insensitive'
      }
    };

    // Add channel filter for files
    if (channelId && channelIds.includes(channelId)) {
      fileFilters.channelId = channelId;
    } else {
      fileFilters.OR = [
        { channelId: { in: channelIds } },
        {
          dmId: {
            in: await prisma.directMessage.findMany({
              where: {
                participants: {
                  some: { id: currentUserId }
                }
              },
              select: { id: true }
            }).then(dms => dms.map(dm => dm.id))
          }
        }
      ];
    }

    // Add user filter
    if (userId) {
      fileFilters.uploadedById = userId;
    }

    // Add date filters
    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      fileFilters.uploadedAt = dateFilter;
    }

    const files = await prisma.file.findMany({
      where: fileFilters,
      include: {
        uploadedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true
          }
        },
        channel: {
          select: {
            id: true,
            name: true,
            workspaceId: true
          }
        }
      },
      orderBy: {
        uploadedAt: 'desc'
      },
      take: limit,
      skip: offset
    });

    results.files = files.map(file => ({
      ...file,
      highlight: highlightText(file.originalName, query),
      type: 'file'
    }));
  }

  // Search users
  if (type === 'all' || type === 'users') {
    const userFilters: any = {
      OR: [
        {
          username: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          firstName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          lastName: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          email: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    };

    // Only search within user's workspaces
    if (workspaceIds.length > 0) {
      userFilters.AND = [
        {
          workspaceMemberships: {
            some: {
              workspaceId: { in: workspaceIds }
            }
          }
        }
      ];
    }

    const users = await prisma.user.findMany({
      where: userFilters,
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        status: true,
        createdAt: true
      },
      take: limit,
      skip: offset
    });

    results.users = users.map(user => ({
      ...user,
      highlight: {
        username: highlightText(user.username, query),
        firstName: highlightText(user.firstName || '', query),
        lastName: highlightText(user.lastName || '', query),
        email: highlightText(user.email, query)
      },
      type: 'user'
    }));
  }

  // Search channels
  if (type === 'all' || type === 'channels') {
    const channelFilters: any = {
      OR: [
        {
          name: {
            contains: query,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: query,
            mode: 'insensitive'
          }
        }
      ]
    };

    // Only search accessible channels
    if (workspaceId && workspaceIds.includes(workspaceId)) {
      channelFilters.workspaceId = workspaceId;
    } else if (workspaceIds.length > 0) {
      channelFilters.workspaceId = { in: workspaceIds };
    }

    // Only show public channels or channels user is a member of
    channelFilters.AND = [
      {
        OR: [
          { type: 'PUBLIC' },
          {
            members: {
              some: { userId: currentUserId }
            }
          }
        ]
      }
    ];

    const channels = await prisma.channel.findMany({
      where: channelFilters,
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      },
      take: limit,
      skip: offset
    });

    results.channels = channels.map(channel => ({
      ...channel,
      highlight: {
        name: highlightText(channel.name, query),
        description: highlightText(channel.description || '', query)
      },
      type: 'channel'
    }));
  }

  // Get total counts for pagination
  const totalCounts: any = {};
  
  if (type === 'all') {
    totalCounts.messages = results.messages?.length || 0;
    totalCounts.files = results.files?.length || 0;
    totalCounts.users = results.users?.length || 0;
    totalCounts.channels = results.channels?.length || 0;
    totalCounts.total = Object.values(totalCounts).reduce((sum: number, count: number) => sum + count, 0);
  }

  res.json({
    success: true,
    query,
    type,
    results,
    totalCounts,
    pagination: {
      limit,
      offset,
      hasMore: (results.messages?.length || 0) + (results.files?.length || 0) + 
               (results.users?.length || 0) + (results.channels?.length || 0) >= limit
    }
  });
}));

// Search suggestions endpoint
router.get('/suggestions', authenticateToken, asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query || typeof query !== 'string' || query.length < 2) {
    return res.json({
      success: true,
      suggestions: []
    });
  }

  const currentUserId = req.user!.id;
  
  // Get user's accessible channels and recent contacts
  const [channels, recentUsers] = await Promise.all([
    prisma.channel.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                name: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            ]
          },
          {
            OR: [
              { type: 'PUBLIC' },
              {
                members: {
                  some: { userId: currentUserId }
                }
              }
            ]
          }
        ]
      },
      include: {
        workspace: {
          select: {
            name: true,
            slug: true
          }
        }
      },
      take: 5
    }),
    
    prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              {
                username: {
                  contains: query,
                  mode: 'insensitive'
                }
              },
              {
                firstName: {
                  contains: query,
                  mode: 'insensitive'
                }
              },
              {
                lastName: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            ]
          },
          {
            id: { not: currentUserId }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        status: true
      },
      take: 5
    })
  ]);

  const suggestions = [
    ...channels.map(channel => ({
      type: 'channel',
      id: channel.id,
      name: channel.name,
      workspace: channel.workspace.name,
      icon: '#'
    })),
    ...recentUsers.map(user => ({
      type: 'user',
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      username: user.username,
      status: user.status,
      icon: '@'
    }))
  ];

  res.json({
    success: true,
    suggestions: suggestions.slice(0, 8)
  });
}));

// Helper function to highlight search terms
function highlightText(text: string, searchTerm: string): string {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export default router;
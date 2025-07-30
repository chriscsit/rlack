import express from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|mp4|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Upload file
router.post('/upload', authenticateToken, upload.single('file'), asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (!req.file) {
    throw createError('No file uploaded', 400);
  }

  const { channelId, workspaceId } = req.body;

  if (!workspaceId) {
    throw createError('Workspace ID is required', 400);
  }

  // Verify user has access to workspace
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: req.user!.id,
      workspaceId
    }
  });

  if (!workspaceMember) {
    throw createError('Access denied to this workspace', 403);
  }

  // If channelId provided, verify access to channel
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

  const fileRecord = await prisma.file.create({
    data: {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
      channelId: channelId || null,
      workspaceId,
      uploadedById: req.user!.id
    },
    include: {
      uploadedBy: {
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

  logger.info(`File uploaded: ${req.file.originalname} by ${req.user!.username}`);

  res.status(201).json({
    message: 'File uploaded successfully',
    file: fileRecord
  });
}));

// Get files for workspace/channel
router.get('/', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { workspaceId, channelId, page = 1, limit = 20 } = req.query;

  if (!workspaceId) {
    throw createError('Workspace ID is required', 400);
  }

  // Verify access
  const workspaceMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: req.user!.id,
      workspaceId: workspaceId as string
    }
  });

  if (!workspaceMember) {
    throw createError('Access denied to this workspace', 403);
  }

  const whereClause: any = {
    workspaceId: workspaceId as string
  };

  if (channelId) {
    // Verify channel access
    const channelMember = await prisma.channelMember.findFirst({
      where: {
        userId: req.user!.id,
        channelId: channelId as string
      }
    });

    if (!channelMember) {
      throw createError('Access denied to this channel', 403);
    }

    whereClause.channelId = channelId as string;
  }

  const files = await prisma.file.findMany({
    where: whereClause,
    include: {
      uploadedBy: {
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true
        }
      },
      channel: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: Number(limit),
    skip: (Number(page) - 1) * Number(limit)
  });

  res.json({ files });
}));

// Download file
router.get('/:fileId/download', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { fileId } = req.params;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
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

  if (!file) {
    throw createError('File not found', 404);
  }

  if (file.workspace.members.length === 0) {
    throw createError('Access denied', 403);
  }

  const filePath = path.join(process.cwd(), 'uploads', file.filename);
  
  res.download(filePath, file.originalName, (err) => {
    if (err) {
      logger.error('File download error:', err);
      throw createError('File download failed', 500);
    }
  });
}));

export { router as fileRoutes };
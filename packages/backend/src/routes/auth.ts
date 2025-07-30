import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { prisma } from '../utils/database';
import { logger } from '../utils/logger';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().alphanum().min(3).max(30).required(),
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  password: Joi.string().min(6).required()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Helper function to generate JWT
const generateToken = (userId: string) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, username, firstName, lastName, password } = value;

  // Check if user exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username }
      ]
    }
  });

  if (existingUser) {
    throw createError('User with this email or username already exists', 409);
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = await prisma.user.create({
    data: {
      email,
      username,
      firstName,
      lastName,
      password: hashedPassword,
      isVerified: true // For demo purposes, skip email verification
    },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      status: true,
      createdAt: true
    }
  });

  const token = generateToken(user.id);

  logger.info(`New user registered: ${user.email}`);

  res.status(201).json({
    message: 'User registered successfully',
    user,
    token
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const { email, password } = value;

  // Find user
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw createError('Invalid credentials', 401);
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw createError('Invalid credentials', 401);
  }

  if (!user.isVerified) {
    throw createError('Email not verified', 401);
  }

  // Update user status to online
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ONLINE' }
  });

  const token = generateToken(user.id);

  logger.info(`User logged in: ${user.email}`);

  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    user: userWithoutPassword,
    token
  });
}));

// Get current user
router.get('/me', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      status: true,
      customStatus: true,
      createdAt: true,
      workspaces: {
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              slug: true,
              avatar: true
            }
          }
        }
      }
    }
  });

  if (!user) {
    throw createError('User not found', 404);
  }

  res.json({ user });
}));

// Update user profile
router.patch('/profile', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const updateSchema = Joi.object({
    firstName: Joi.string().min(1).max(50),
    lastName: Joi.string().min(1).max(50),
    avatar: Joi.string().uri(),
    status: Joi.string().valid('ONLINE', 'AWAY', 'DO_NOT_DISTURB', 'OFFLINE'),
    customStatus: Joi.string().max(100).allow('')
  });

  const { error, value } = updateSchema.validate(req.body);
  if (error) {
    throw createError(error.details[0].message, 400);
  }

  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: value,
    select: {
      id: true,
      email: true,
      username: true,
      firstName: true,
      lastName: true,
      avatar: true,
      status: true,
      customStatus: true,
      updatedAt: true
    }
  });

  logger.info(`User profile updated: ${req.user!.email}`);

  res.json({
    message: 'Profile updated successfully',
    user
  });
}));

// Logout
router.post('/logout', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Update user status to offline
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { status: 'OFFLINE' }
  });

  logger.info(`User logged out: ${req.user!.email}`);

  res.json({ message: 'Logout successful' });
}));

export { router as authRoutes };
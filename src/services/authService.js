const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRY = '7d';

class AuthService {
  async register(email, password, name) {
    console.log(`[Auth] Registering new user: ${email}`);

    // Check if user exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Error('User already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        plan: 'FREE'
      }
    });

    // Generate token
    const token = this.generateToken(user);

    return { user: this.sanitizeUser(user), token };
  }

  async login(email, password) {
    console.log(`[Auth] Login attempt: ${email}`);

    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      throw new Error('Invalid credentials');
    }

    // Check if active
    if (!user.isActive) {
      throw new Error('Account is inactive');
    }

    // Generate token
    const token = this.generateToken(user);

    return { user: this.sanitizeUser(user), token };
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || !user.isActive) {
        throw new Error('Invalid token');
      }

      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  generateToken(user) {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        plan: user.plan
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  sanitizeUser(user) {
    const { password, ...sanitized } = user;
    return sanitized;
  }

  async checkUsageLimit(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    const limits = {
      FREE: 10,
      PROFESSIONAL: 100,
      TEAM: -1, // unlimited
      ENTERPRISE: -1
    };

    const limit = limits[user.plan];
    if (limit === -1) return true; // unlimited

    return user.auditsThisMonth < limit;
  }

  async incrementUsage(userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        auditsThisMonth: { increment: 1 },
        lastAuditAt: new Date()
      }
    });
  }

  async incrementAuditCount(userId) {
    return this.incrementUsage(userId);
  }

  async resetMonthlyUsage() {
    // Run on 1st of each month
    console.log('[Auth] Resetting monthly usage for all users');
    await prisma.user.updateMany({
      data: { auditsThisMonth: 0 }
    });
  }
}

module.exports = new AuthService();

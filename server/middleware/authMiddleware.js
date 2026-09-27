import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'railready_super_secret_jwt_key_2026_academic_demo', {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized to access this route, token missing'
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'railready_super_secret_jwt_key_2026_academic_demo'
    );
    const user = await User.findById(decoded.id);

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: 'User not found or account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, token invalid or expired'
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `User role '${req.user ? req.user.role : 'anonymous'}' is not authorized to perform this action`
      });
    }
    next();
  };
};

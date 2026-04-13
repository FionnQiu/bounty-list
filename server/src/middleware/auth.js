import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: '未登录或 token 缺失'
    });
  }

  try {
    req.user = jwt.verify(authHeader.slice(7), config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: '登录状态已失效'
    });
  }
}



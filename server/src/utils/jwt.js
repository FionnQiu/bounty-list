import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}


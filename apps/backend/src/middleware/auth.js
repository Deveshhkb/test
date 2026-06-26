import { verifyToken } from '../utils/token.js';
import { ApiError } from '../utils/asyncHandler.js';
import User from '../models/User.js';

/** Require a valid JWT (from cookie or Authorization header). */
export const protect = async (req, res, next) => {
  try {
    let token = req.cookies?.token;
    const header = req.headers.authorization;
    if (!token && header?.startsWith('Bearer ')) token = header.split(' ')[1];

    if (!token) throw new ApiError(401, 'Not authenticated. Please log in.');

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);
    if (!user) throw new ApiError(401, 'User no longer exists.');

    req.user = user;
    next();
  } catch (err) {
    next(new ApiError(401, 'Invalid or expired session.'));
  }
};

/** Restrict a route to specific roles (defaults to admin-only). */
export const authorize = (...roles) => (req, res, next) => {
  const allowed = roles.length ? roles : ['admin'];
  if (!allowed.includes(req.user?.role)) {
    return next(new ApiError(403, 'You do not have permission to perform this action.'));
  }
  next();
};

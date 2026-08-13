import jwt from 'jsonwebtoken';

export const signToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

export const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

/**
 * Cookie flags for the auth token.
 *
 * Derived from the request rather than NODE_ENV: the storefront and the API
 * sit on different subdomains, so the cookie is cross-site and only travels
 * with SameSite=None, which in turn requires Secure. Keying this off NODE_ENV
 * meant a deploy that forgot to set it silently dropped every login cookie.
 * Falls back to Lax over plain HTTP, where Secure cookies can't be set at all.
 */
export const authCookieOptions = (req) => {
  const isHttps = Boolean(req?.secure) || req?.headers?.['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
};

/** Attach a JWT to the response both as an httpOnly cookie and in the body. */
export const sendAuthToken = (res, user, statusCode = 200) => {
  const token = signToken(user._id);
  res.cookie('token', token, authCookieOptions(res.req));
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
    },
  });
};

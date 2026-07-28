const jwt = require("jsonwebtoken");
const config = require("./config");
const db = require("./db");

function issueToken(username) {
  return jwt.sign({ sub: username, usertype: "3" }, config.JWT_SECRET, {
    expiresIn: config.TOKEN_TTL_SECONDS,
  });
}

// Express middleware: requires "Authorization: Bearer <jwt>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token)
    return res.status(401).json({ status: false, message: "Missing token" });
  try {
    const payload = jwt.verify(token, config.JWT_SECRET);
    const user = db.getUser(payload.sub);
    if (!user)
      return res.status(401).json({ status: false, message: "Unknown user" });
    req.username = user.username;
    next();
  } catch {
    return res
      .status(401)
      .json({ status: false, message: "Invalid or expired token" });
  }
}

module.exports = { issueToken, requireAuth };

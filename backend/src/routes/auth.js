// Login / register — issues the JWT the game page expects as ?id=<token>

const express = require("express");
const config = require("../config");
const db = require("../db");
const { issueToken } = require("../auth");

const router = express.Router();

function validCreds(username, password) {
  return (
    typeof username === "string" &&
    /^[a-zA-Z0-9_.-]{3,30}$/.test(username) &&
    typeof password === "string" &&
    password.length >= 4
  );
}

router.post("/register", (req, res) => {
  const { username, password } = req.body || {};
  if (!validCreds(username, password))
    return res.status(400).json({
      status: false,
      message: "Username (3-30 chars, alphanumeric) and password (4+ chars) required",
    });
  const user = db.createUser(username, password);
  if (!user)
    return res.status(409).json({ status: false, message: "Username already taken" });
  res.json({
    status: true,
    message: "Registered",
    data: { token: issueToken(username), username, balance: user.balance },
  });
});

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.getUser(username);
  if (!user || !db.verifyPassword(password || "", user.passwordHash))
    return res.status(401).json({ status: false, message: "Invalid username or password" });
  res.json({
    status: true,
    message: "Logged in",
    data: { token: issueToken(username), username, balance: user.balance },
  });
});

// Operator top-up, guarded by ADMIN_KEY:
//   POST /auth/add-balance { username, amount } with header x-admin-key
router.post("/add-balance", (req, res) => {
  if (req.headers["x-admin-key"] !== config.ADMIN_KEY)
    return res.status(403).json({ status: false, message: "Forbidden" });
  const { username, amount } = req.body || {};
  const balance = db.adjustBalance(username, Number(amount) || 0);
  if (balance === null)
    return res.status(404).json({ status: false, message: "User not found" });
  res.json({ status: true, data: { username, balance } });
});

module.exports = router;

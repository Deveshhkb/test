import AiSettings from '../models/AiSettings.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';
import { verifyToken } from '../utils/token.js';
import { handleChat, sanitize } from '../services/aiService.js';
import { isAiConfigured } from '../config/anthropic.js';

// --- simple in-memory per-session rate limiter (respects admin setting) ---
const hits = new Map(); // sessionId -> [timestamps]
function rateLimited(key, perMinute) {
  const now = Date.now();
  const windowStart = now - 60_000;
  const arr = (hits.get(key) || []).filter((t) => t > windowStart);
  if (arr.length >= perMinute) return true;
  arr.push(now);
  hits.set(key, arr);
  return false;
}
// Periodically clear stale buckets so the map doesn't grow unbounded.
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [k, v] of hits) if (!v.some((t) => t > cutoff)) hits.delete(k);
}, 300_000).unref?.();

/** Best-effort auth: attach req.user if a valid token is present, never throw. */
async function resolveUser(req) {
  try {
    let token = req.cookies?.token;
    const header = req.headers.authorization;
    if (!token && header?.startsWith('Bearer ')) token = header.split(' ')[1];
    if (!token) return null;
    const decoded = verifyToken(token);
    return await User.findById(decoded.id);
  } catch {
    return null;
  }
}

// GET /api/ai/config  — public settings the widget needs
export const getConfig = asyncHandler(async (req, res) => {
  const s = await AiSettings.getSettings();
  res.json({
    success: true,
    config: {
      enabled: s.enabled,
      welcomeMessage: s.welcomeMessage,
      suggestedQuestions: s.suggestedQuestions,
      llmEnabled: isAiConfigured(),
    },
  });
});

// POST /api/ai/chat  — { message, sessionId, locale, history }
export const chat = asyncHandler(async (req, res) => {
  const settings = await AiSettings.getSettings();
  if (!settings.enabled) {
    return res.json({ success: true, reply: 'The assistant is currently unavailable.', products: [], disabled: true });
  }

  const { message, sessionId = 'anon', locale = 'en', history = [] } = req.body;
  const clean = sanitize(message);
  if (!clean) throw new ApiError(400, 'Message is required.');

  const key = `${sessionId}:${req.ip}`;
  if (rateLimited(key, settings.rateLimitPerMinute)) {
    throw new ApiError(429, 'You are sending messages too quickly. Please slow down.');
  }

  const user = await resolveUser(req);

  const result = await handleChat({
    message: clean,
    user,
    locale,
    history: Array.isArray(history) ? history.slice(-8) : [],
    settings,
  });

  // Persist for admin analytics (fire-and-forget; ignore failures).
  Conversation.findOneAndUpdate(
    { sessionId },
    {
      $setOnInsert: { sessionId, user: user?._id || null, locale },
      $push: {
        messages: {
          $each: [
            { role: 'user', text: clean },
            { role: 'assistant', text: result.reply, intent: result.intent },
          ],
        },
      },
      $inc: { messageCount: 2 },
    },
    { upsert: true, new: true }
  ).catch(() => {});

  res.json({ success: true, ...result });
});

// ---- Admin ----
// GET /api/ai/admin/settings
export const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await AiSettings.getSettings();
  res.json({ success: true, settings, llmConfigured: isAiConfigured() });
});

// PUT /api/ai/admin/settings
export const updateAdminSettings = asyncHandler(async (req, res) => {
  const allowed = ['enabled', 'welcomeMessage', 'suggestedQuestions', 'model', 'temperature', 'maxTokens', 'rateLimitPerMinute'];
  const patch = {};
  for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
  const settings = await AiSettings.findOneAndUpdate({ key: 'default' }, patch, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  res.json({ success: true, settings });
});

// GET /api/ai/admin/conversations
export const listConversations = asyncHandler(async (req, res) => {
  const [conversations, total, withUser] = await Promise.all([
    Conversation.find().populate('user', 'name email').sort('-updatedAt').limit(30),
    Conversation.countDocuments(),
    Conversation.countDocuments({ user: { $ne: null } }),
  ]);
  const totalMessages = conversations.reduce((n, c) => n + c.messageCount, 0);
  res.json({
    success: true,
    conversations,
    analytics: { totalConversations: total, loggedInConversations: withUser, recentMessages: totalMessages },
  });
});

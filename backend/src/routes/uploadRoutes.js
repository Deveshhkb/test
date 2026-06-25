import express from 'express';
import { upload } from '../middleware/upload.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// @route POST /api/upload  (admin) — multipart form field name: "image"
// Returns an absolute URL to the stored file.
router.post('/', protect, adminOnly, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No image file received' });
  }
  // Prefer an explicit public URL (correct when behind nginx/HTTPS); otherwise
  // fall back to the request's protocol + host.
  const base = process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`;
  const url = `${base.replace(/\/$/, '')}/uploads/${req.file.filename}`;
  res.status(201).json({ success: true, url });
});

export default router;

import SiteSettings from '../models/SiteSettings.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// GET /api/settings  — public settings the storefront needs
export const getPublicSettings = asyncHandler(async (req, res) => {
  const s = await SiteSettings.getSettings();
  res.json({ success: true, settings: { announcement: s.announcement } });
});

// GET /api/settings/admin  (admin)
export const getAdminSettings = asyncHandler(async (req, res) => {
  const settings = await SiteSettings.getSettings();
  res.json({ success: true, settings });
});

// PUT /api/settings/admin  (admin)
export const updateSettings = asyncHandler(async (req, res) => {
  const { announcement } = req.body;
  const patch = {};
  if (announcement && typeof announcement === 'object') {
    patch.announcement = {
      enabled: announcement.enabled !== false,
      text: (announcement.text || '').slice(0, 200),
      link: announcement.link || '',
    };
  }
  const settings = await SiteSettings.findOneAndUpdate({ key: 'default' }, patch, {
    new: true,
    upsert: true,
    runValidators: true,
  });
  res.json({ success: true, settings });
});

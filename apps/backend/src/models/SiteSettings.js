import mongoose from 'mongoose';

/**
 * Singleton document for global, admin-editable storefront settings
 * (announcement bar, etc.). Fetch with SiteSettings.getSettings().
 */
const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    announcement: {
      enabled: { type: Boolean, default: true },
      // When blank, the storefront falls back to the translated default.
      text: { type: String, default: '' },
      link: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

siteSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) doc = await this.create({ key: 'default' });
  return doc;
};

export default mongoose.model('SiteSettings', siteSettingsSchema);

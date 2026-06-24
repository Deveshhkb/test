/**
 * Returns a sub-schema definition for a translatable string.
 * Each supported language has its own field; the frontend falls back to `en`.
 */
export const localizedString = () => ({
  en: { type: String, default: '' },
  hi: { type: String, default: '' },
  gu: { type: String, default: '' },
  mr: { type: String, default: '' },
  bn: { type: String, default: '' },
  ta: { type: String, default: '' },
  te: { type: String, default: '' },
  kn: { type: String, default: '' },
  _id: false,
});

export const SUPPORTED_LANGUAGES = ['en', 'hi', 'gu', 'mr', 'bn', 'ta', 'te', 'kn'];

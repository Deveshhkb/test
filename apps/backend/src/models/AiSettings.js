import mongoose from 'mongoose';

/**
 * Singleton document holding admin-configurable AI assistant settings.
 * Fetch with AiSettings.getSettings().
 */
const aiSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    enabled: { type: Boolean, default: true },
    welcomeMessage: {
      type: String,
      default: "Hi! 👋 I'm NovaStyle AI, your personal fashion assistant. How can I help you today?",
    },
    suggestedQuestions: {
      type: [String],
      default: [
        'Show me trending hoodies',
        'Best running shoes',
        "Women's new arrivals",
        'Gift ideas under ₹1000',
        "Today's offers",
        'Track my order',
        'Payment options',
        'Shipping information',
        'Return policy',
      ],
    },
    // Claude model + generation params (see /apps/backend/src/config/anthropic.js)
    model: { type: String, default: 'claude-opus-4-8' },
    temperature: { type: Number, default: 0.7, min: 0, max: 1 },
    maxTokens: { type: Number, default: 1024, min: 128, max: 4096 },
    // Per-user rate limiting for the chat endpoint
    rateLimitPerMinute: { type: Number, default: 20 },
  },
  { timestamps: true }
);

aiSettingsSchema.statics.getSettings = async function getSettings() {
  let doc = await this.findOne({ key: 'default' });
  if (!doc) doc = await this.create({ key: 'default' });
  return doc;
};

export default mongoose.model('AiSettings', aiSettingsSchema);

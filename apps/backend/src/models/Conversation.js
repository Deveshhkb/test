import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    text: { type: String, required: true },
    intent: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

/**
 * Lightweight conversation log for admin analytics. One document per browser
 * session (sessionId), optionally linked to a user.
 */
const conversationSchema = new mongoose.Schema(
  {
    sessionId: { type: String, required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    locale: { type: String, default: 'en' },
    messages: [messageSchema],
    messageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Conversation', conversationSchema);

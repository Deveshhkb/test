import mongoose from 'mongoose';

const cmsPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    content: { type: String, default: '' }, // HTML / markdown
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('CmsPage', cmsPageSchema);

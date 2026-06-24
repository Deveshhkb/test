import mongoose from 'mongoose';
import slugify from 'slugify';
import { localizedString } from '../utils/localized.js';

const blogSchema = new mongoose.Schema(
  {
    title: { ...localizedString() },
    slug: { type: String, unique: true, index: true },
    excerpt: { ...localizedString() },
    content: { ...localizedString() },
    coverImage: { type: String, required: true },
    author: { type: String, default: 'Ayodhya Tirtham Team' },
    category: { type: String, default: 'Pilgrimage' },
    tags: [{ type: String }],
    readTime: { type: Number, default: 5 },
    published: { type: Boolean, default: true },
    // SEO
    metaTitle: { type: String, default: '' },
    metaDescription: { type: String, default: '' },
  },
  { timestamps: true }
);

blogSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = slugify(this.title.en || 'blog', { lower: true, strict: true });
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;

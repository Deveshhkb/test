import mongoose from 'mongoose';

const gallerySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    category: {
      type: String,
      enum: ['Temples', 'Festivals', 'Ghats', 'Aarti', 'Nature', 'Pilgrims'],
      default: 'Temples',
    },
    url: { type: String, required: true }, // image url or video embed url
    thumbnail: { type: String, default: '' },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Gallery = mongoose.model('Gallery', gallerySchema);
export default Gallery;

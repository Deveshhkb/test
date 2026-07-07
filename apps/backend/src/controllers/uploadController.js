import { uploadBuffer, deleteImage } from '../config/cloudinary.js';
import { asyncHandler, ApiError } from '../utils/asyncHandler.js';

// POST /api/upload  (admin) — single or multiple images via multipart "images"
export const uploadImages = asyncHandler(async (req, res) => {
  const files = req.files?.length ? req.files : req.file ? [req.file] : [];
  if (!files.length) throw new ApiError(400, 'No image files received.');

  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new ApiError(503, 'Cloudinary is not configured on the server.');
  }

  const results = await Promise.all(
    files.map((f) => uploadBuffer(f.buffer, req.body.folder || 'clothinary/products'))
  );

  res.status(201).json({
    success: true,
    images: results.map((r) => ({ url: r.secure_url, publicId: r.public_id })),
  });
});

// DELETE /api/upload  (admin)
export const removeImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;
  if (!publicId) throw new ApiError(400, 'publicId is required.');
  await deleteImage(publicId);
  res.json({ success: true, message: 'Image deleted.' });
});

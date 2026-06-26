import { Router } from 'express';
import { uploadImages, removeImage } from '../controllers/uploadController.js';
import { protect, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = Router();
router.use(protect, authorize('admin'));

router.post('/', upload.array('images', 8), uploadImages);
router.delete('/', removeImage);

export default router;

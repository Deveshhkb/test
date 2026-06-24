import express from 'express';
import {
  createEnquiry,
  listEnquiries,
  updateEnquiry,
  deleteEnquiry,
} from '../controllers/enquiryController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createEnquiry);
router.get('/', protect, adminOnly, listEnquiries);
router.put('/:id', protect, adminOnly, updateEnquiry);
router.delete('/:id', protect, adminOnly, deleteEnquiry);

export default router;

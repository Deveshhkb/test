import { Router } from 'express';
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
} from '../controllers/addressController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', listAddresses);
router.post('/', createAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);

export default router;

import { Router } from 'express';
import { listCards, addCard, setDefaultCard, deleteCard } from '../controllers/cardController.js';
import { protect } from '../middleware/auth.js';

const router = Router();
router.use(protect);

router.get('/', listCards);
router.post('/', addCard);
router.put('/:id/default', setDefaultCard);
router.delete('/:id', deleteCard);

export default router;

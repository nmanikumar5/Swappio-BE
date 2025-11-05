import { Router } from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  addFavoriteSchema,
} from '../controllers/favoriteController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', authenticate, getFavorites);
router.post('/', authenticate, validate(addFavoriteSchema), addFavorite);
router.delete('/:listingId', authenticate, removeFavorite);

export default router;

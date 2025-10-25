import { Router } from 'express';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  addFavoriteSchema,
} from '../controllers/favoriteController';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

router.get('/', authenticate, getFavorites);
router.post('/', authenticate, validate(addFavoriteSchema), addFavorite);
router.delete('/:listingId', authenticate, removeFavorite);

export default router;

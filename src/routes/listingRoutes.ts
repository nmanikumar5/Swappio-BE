import { Router } from 'express';
import {
  createListing,
  getListings,
  suggestListings,
  getListing,
  updateListing,
  deleteListing,
  getMyListings,
  createListingSchema,
  updateListingSchema,
} from '../controllers/listingController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';

const router = Router();

router.get('/', getListings);
router.get('/suggest', suggestListings);
router.get('/my', authenticate, getMyListings);
router.get('/:id', getListing);
router.post('/', authenticate, validate(createListingSchema), createListing);
router.put('/:id', authenticate, validate(updateListingSchema), updateListing);
router.delete('/:id', authenticate, deleteListing);

export default router;

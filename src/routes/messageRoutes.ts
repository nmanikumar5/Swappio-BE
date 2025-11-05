import { Router } from 'express';
import {
  sendMessage,
  getConversations,
  getMessages,
  getUnreadCount,
} from '../controllers/messageController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, sendMessage);
router.get('/conversations', authenticate, getConversations);
router.get('/unread/count', authenticate, getUnreadCount);
// IMPORTANT: This must come AFTER /unread/count to avoid route conflict
router.get('/:userId', authenticate, getMessages);

export default router;

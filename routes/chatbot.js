import express from 'express';
import { sendMessage,} from '../controllers/chatbot.js';

const router = express.Router();

// Get all quizzes
router.post('/', sendMessage);


export default router;

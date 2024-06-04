import express from 'express';
import { getQuizes, getQuizById, getTopics, createQuiz } from '../controllers/quizes.js';

const router = express.Router();

// Get all quizzes
router.get('/:sessionKey', getQuizes);
router.get('/topics', getTopics);
router.get('/quizId/:id', getQuizById);
router.post('/:sessionKey', createQuiz);

export default router;

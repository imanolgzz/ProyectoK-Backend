import express from 'express';
import { getQuizes, getQuizById, getTopics, createQuiz } from '../controllers/quizes.js';

const router = express.Router();

// Get all quizzes
router.get('/', getQuizes);
router.get('/topics', getTopics);
router.get('/:id', getQuizById);
router.post('/', createQuiz);

export default router;

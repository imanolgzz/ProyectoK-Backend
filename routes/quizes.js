import express from 'express';
import { getQuizes, getQuizById, getTopics, createQuiz,updateQuiz, postTopic } from '../controllers/quizes.js';

const router = express.Router();

// Get all quizzes
router.get('/:sessionKey', getQuizes);
router.get('/topics', getTopics);
router.get('/quizId/:id', getQuizById);
router.post('/:sessionKey', createQuiz);
router.put('/', updateQuiz);
router.post('/topics/posting', postTopic);

export default router;

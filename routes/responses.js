import express from 'express';
const router = express.Router();
import { getResponse, postResponse, getResponseByUser, getResponseByQuiz } from '../controllers/responses.js';

router.post("/:sessionKey", postResponse);
router.get("/user/:id", getResponseByUser);
router.get("/:id", getResponse);
router.get("/quizResponses/:id", getResponseByQuiz);



export default router;
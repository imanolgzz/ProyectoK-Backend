import express from 'express';
const router = express.Router();
import { getResponse, postResponse, getResponseByUser } from '../controllers/responses.js';

router.post("/", postResponse);
router.get("/user/:id", getResponseByUser);
router.get("/:id", getResponse);



export default router;
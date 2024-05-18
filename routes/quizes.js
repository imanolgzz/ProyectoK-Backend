const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { getQuizes, getQuizById, getTopics, createQuiz} = require("../controllers/quizes.js");
//get all quizes
router.get("/", getQuizes);
router.get("/:id", getQuizById);
router.get("/topics, getTopics")
router.post("/", createQuiz);

module.exports = router;

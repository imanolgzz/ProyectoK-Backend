const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { getQuizes, getQuizById } = require("../controllers/quizes.js");
//get all quizes
router.get("/", getQuizes);
router.get("/:id", getQuizById);

module.exports = router;

const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { postResponse, getResponse} = require("../controllers/responses.js");


router.post("/", postResponse);
router.get("/:id", getResponse);



module.exports = router;

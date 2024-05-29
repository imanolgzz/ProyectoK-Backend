const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { postResponse, getResponse, getResponseByUser} = require("../controllers/responses.js");


router.post("/", postResponse);
router.get("/user/:id", getResponseByUser);
router.get("/:id", getResponse);



module.exports = router;

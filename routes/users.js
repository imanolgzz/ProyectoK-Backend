const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { getUsers, getUserById, createUser } = require("../controllers/users.js");

//get all users
router.get("/", getUsers);
//get user by id
router.get("/:id", getUserById);

//router.get("/login/:username", loginByUsername);

//create new user NOT READY
router.post("/", createUser);



module.exports = router;

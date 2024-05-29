import express from 'express';
const router = express.Router();
import { getUsers, getUserByEmail, createUser } from '../controllers/users.js';
//get all users
router.get("/", getUsers);
//get user by email
router.get("/:email", getUserByEmail);

//router.get("/login/:username", loginByUsername);

//create new user NOT READY
router.post("/", createUser);



export default router;
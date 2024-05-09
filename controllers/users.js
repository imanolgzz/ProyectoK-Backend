const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");

// this file is to have the controlers for each route

async function getUsers(req, res) {
    client.query("SELECT * FROM users", (err, result) => {
        if (err) {
          console.log("Error executing query", err);
          res.status(500).json({ message: "Error executing query" });
        } else {
          console.log("Query result", result.rows);
          res.status(200).json(result.rows);
        }
      });
}

async function getUserById(req, res) {
    console.log("Request params", req.params.id);
  const id = req.params.id;
  client.query(
    "SELECT * FROM users WHERE user_id = $1",
    [id],
    (err, result) => {
      if (err) {
        console.log("User does not exist", err);
        res.status(500).json({ message: "Error executing query" });
      } else {
        if (result.rows.length === 0) {
          res.status(404).json({ message: "this user does not exist" });
        } else {
          console.log("Query result", result.rows);
          res.status(200).json(result.rows);
        }
      }
    }
  );
}
// create a new user NOT READY
async function createUser(req, res) {
    const { name, email, password } = req.body;
  client.query(
    "INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
    [name, email, password],
    (err, result) => {
      if (err) {
        console.log("Error executing query", err);
        res.status(500).json({ message: "Error executing query" });
      } else {
        console.log("Query result", result.rows);
        res.status(200).json(result.rows);
      }
    }
  );
}

exports.getUsers = getUsers;
exports.getUserById = getUserById;
exports.createUser = createUser;

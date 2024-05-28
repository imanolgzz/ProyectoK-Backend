const express = require("express");
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

async function getUserByEmail(req, res) {
  console.log("Request params", req.params.email);
  const email = req.params.email;
  client.query(
    "SELECT * FROM users WHERE user_email = $1",
    [email],
    (err, result) => {
      if (err) {
        console.log("User does not exist", err);
        res.status(500).json({ message: "Error executing query" });
      } else {
        if (result.rows.length === 0) {
          res.status(404).json({ message: "this user does not exist" });
        } else {
          console.log("Query result", result.rows);
          const userId = result.rows[0].user_id;
          // Delete any session row with the user's user_id
          client.query(
            "DELETE FROM sessions WHERE user_id = $1",
            [userId],
            (err, deleteResult) => {
              if (err) {
                console.log("Error deleting session", err);
                res.status(500).json({ message: "Error deleting session" });
              } else {
                // Create a new session
                client.query(
                  "CALL insert_session($1)",
                  [userId],
                  (err, callResult) => {
                    if (err) {
                      console.log("Error calling insert_session", err);
                      res
                        .status(500)
                        .json({ message: "Error calling insert_session" });
                    } else {
                      // Select the session
                      client.query(
                        "SELECT * FROM sessions WHERE user_id = $1",
                        [userId],
                        (err, selectResult) => {
                          if (err) {
                            console.log("Error selecting session", err);
                            res
                              .status(500)
                              .json({ message: "Error selecting session" });
                          } else {
                            console.log("Session selected", selectResult.rows);
                            res
                              .status(200)
                              .json({
                                user: result.rows[0],
                                session: selectResult.rows[0],
                              });
                          }
                        }
                      );
                    }
                  }
                );
              }
            }
          );
        }
      }
    }
  );
}

// create a new user
async function createUser(req, res) {
  try {
    const { username, email, firstName, lastName, isAdmin } = req.body;
    console.log("Request body", req.body);
    client.query(
      "INSERT INTO users (user_name, user_email, first_name, last_name, is_admin) VALUES ($1, $2, $3, $4, $5) RETURNING user_id",
      [username, email, firstName, lastName, isAdmin],
      (err, result) => {
        if (err) {
          console.log("Error executing query", err);
          res.status(500).json({ message: "Error executing query" });
        } else {
          console.log("Query result", result.rows);
          const userId = result.rows[0].user_id;
          client.query(
            "SELECT * FROM sessions WHERE user_id = $1",
            [userId],
            (err, sessionResult) => {
              if (err) {
                console.log("Error executing session query", err);
                res
                  .status(500)
                  .json({ message: "Error executing session query" });
              } else {
                console.log("Session query result", sessionResult.rows);
                res.status(200).json({
                  message: "User created successfully",
                  user: result.rows[0],
                  session: sessionResult.rows[0],
                });
              }
            }
          );
        }
      }
    );
  } catch (err) {
    console.log("Error creating user", err);
    res.status(500).json({ message: "Error creating user" });
  }
}

exports.getUsers = getUsers;
exports.getUserByEmail = getUserByEmail;
exports.createUser = createUser;

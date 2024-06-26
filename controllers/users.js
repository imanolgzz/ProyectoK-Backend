import client from "../helpers/postgres.js";

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
                            res.status(200).json({
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
          console.log("User ID", userId);
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
                if (sessionResult.rows.length === 0) {
                  console.log("No session found for user");
                }
                // Query to select the user by their ID
                client.query(
                  "SELECT * FROM users WHERE user_id = $1",
                  [userId],
                  (err, userResult) => {
                    if (err) {
                      console.log("Error executing user query", err);
                      res
                        .status(500)
                        .json({ message: "Error executing user query" });
                    } else {
                      console.log("User query result", userResult.rows);
                      res.status(200).json({
                        message: "User created successfully",
                        user: userResult.rows[0], // Return the user from the user query
                        session: sessionResult.rows[0],
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
  } catch (err) {
    console.log("Error creating user", err);
    res.status(500).json({ message: "Error creating user" });
  }
}

export { getUsers, getUserByEmail, createUser };

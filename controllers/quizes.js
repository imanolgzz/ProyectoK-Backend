import client from "../helpers/postgres.js";

// this file is to have the controlers for each route

async function getQuizes(req, res) {
  const sessionKey = req.params.sessionKey;
  // check if the session key is valid
  const sessionResult = await client.query(
    "SELECT * FROM sessions WHERE session_key = $1",
    [sessionKey]
  );

  if (sessionResult.rows.length > 0) {
    const session = sessionResult.rows[0];
    const createdAt = new Date(session.created_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (createdAt >= twoHoursAgo) {
      // The session was created less than 2 hours ago
      // continue with the request
    } else {
      // The session was created more than 2 hours ago
      return res.status(401).json({ message: "Session expired" });
    }
  } else {
    // No session found
    return res.status(401).json({ message: "Invalid session key" });
  }
  // get all the quizes
  client.query(
    "SELECT quiz.*, topics.topic_name, users.user_name AS author FROM quiz INNER JOIN topics ON quiz.topic_id = topics.topic_id INNER JOIN users ON quiz.admin_id = users.user_id",
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

async function getQuizById(req, res) {
  console.log("Getting quiz by id");
  const sessionKey = req.headers.sessionkey;

  // check if the session key is valid
  const sessionResult = await client.query(
    "SELECT * FROM sessions WHERE session_key = $1",
    [sessionKey]
  );

  if (sessionResult.rows.length > 0) {
    const session = sessionResult.rows[0];
    const createdAt = new Date(session.created_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (createdAt >= twoHoursAgo) {
      // The session was created less than 2 hours ago
      // continue with the request
    } else {
      // The session was created more than 2 hours ago
      return res.status(401).json({ message: "Session expired" });
    }
  } else {
    // No session found
    return res.status(401).json({ message: "Invalid session key" });
  }

  const id = req.params.id;
  try {
    const result = await client.query(
      `SELECT
                        quiz.quiz_id,
                        quiz.admin_id,
                        quiz.topic_id,
                        quiz.quiz_name,
                        topics.topic_name,
                        questions.question_id,
                        questions.question,
                        questions.question_ans1,
                        questions.question_ans2,
                        questions.question_ans3,
                        questions.question_ans4,
                        questions.correct_answer,
                        questions.active
                    FROM quiz
                    INNER JOIN topics ON quiz.topic_id = topics.topic_id
                    LEFT JOIN questions ON quiz.quiz_id = questions.quiz_id
                    WHERE quiz.quiz_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ message: "This quiz does not exist" });
    } else {
      // Group questions by quiz
      const quizData = {
        quiz_id: result.rows[0].quiz_id,
        admin_id: result.rows[0].admin_id,
        topic_id: result.rows[0].topic_id,
        quiz_name: result.rows[0].quiz_name,
        topic_name: result.rows[0].topic_name,
        questions: result.rows
          .filter((row) => row.question_id !== null)
          .map((row) => ({
            question_id: row.question_id,
            question: row.question,
            options: [
              row.question_ans1,
              row.question_ans2,
              row.question_ans3,
              row.question_ans4,
            ],
            correct_answer: row.correct_answer,
            active: row.active,
          })),
      };

      res.status(200).json(quizData);
    }
  } finally {
  }
}

async function createQuiz(req, res) {
    const sessionKey = req.params.sessionKey;
    console.log("Session key", sessionKey);
    // check if the session key is valid
    const sessionResult = await client.query(
        "SELECT * FROM sessions WHERE session_key = $1",
        [sessionKey]
      );

      if (sessionResult.rows.length > 0) {
        const session = sessionResult.rows[0];
        const createdAt = new Date(session.created_at);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        if (createdAt >= twoHoursAgo) {
          // The session was created less than 2 hours ago
          // continue with the request
        } else {
          // The session was created more than 2 hours ago
          return res.status(401).json({ message: "Session expired" });
        }
      } else {
        // No session found
        return res.status(401).json({ message: "Invalid session key" });
      }

  try {
    const { adminId, topicId, name, questions } = req.body;

    await client.query("BEGIN");

    // Insert the quiz
    const quizResult = await client.query(
      "INSERT INTO quiz (admin_id, topic_id, quiz_name) VALUES ($1, $2, $3) RETURNING quiz_id",
      [adminId, topicId, name]
    );
    const quizId = quizResult.rows[0].quiz_id;

    // Insert the questions
    const questionPromises = questions.map((q) =>
      client.query(
        "INSERT INTO questions (quiz_id, question, question_ans1, question_ans2, question_ans3, question_ans4, correct_answer, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          quizId,
          q.question,
          q.opcion1,
          q.opcion2,
          q.opcion3,
          q.opcion4,
          q.answer,
          q.active,
        ]
      )
    );

    await Promise.all(questionPromises);

    await client.query("COMMIT");

    res
      .status(201)
      .send({ message: "Quiz created successfully", quizId: quizId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).send({ message: "Error creating quiz" });
  }
}

async function getTopics(req, res) {
  console.log("Getting topics");
  client.query("SELECT * FROM topics", (err, result) => {
    if (err) {
      console.log("Error executing query", err);
      res.status(500).json({ message: "Error executing query" });
    } else {
      console.log("Query result", result.rows);
      res.status(200).json(result.rows);
    }
  });
}

async function updateQuiz(req,res){
  console.log("Updating Quiz")
  const sessionKey = req.headers.sessionkey;
  console.log("Session key", req.headers);
  console.log("Session key", sessionKey);

  const sessionResult = await client.query(
    "SELECT * FROM sessions WHERE session_key = $1",
    [sessionKey]
  );

  if (sessionResult.rows.length > 0) {
    const session = sessionResult.rows[0];
    const createdAt = new Date(session.created_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (createdAt >= twoHoursAgo) {
      // The session was created less than 2 hours ago
      // continue with the request
    } else {
      // The session was created more than 2 hours ago
      return res.status(401).json({ message: "Session expired" });
    }
  } else {
    // No session found
    return res.status(401).json({ message: "Invalid session key" });
  }

  console.log("BODY", req.body);

  return res.status(200).json({ message: "Quiz updated successfully" });



}

export { getQuizes, getQuizById, createQuiz, getTopics,updateQuiz };

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

async function updateQuiz(req, res) {
  console.log("Updating Quiz");
  const sessionKey = req.headers.sessionkey;
  console.log("Session key", sessionKey);

  try {
    // Check if session is valid
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

        // Extract data from request body
        const { quiz_id, admin_id, topic_id, quiz_name, questions } = req.body;

        // Update quiz data
        await client.query("CALL update_quiz($1, $2, $3, $4)", [
          quiz_id,
          admin_id,
          topic_id,
          quiz_name,
        ]);

        // Fetch current questions associated with the quiz
        const currentQuestionsResult = await client.query(
          "SELECT * FROM questions WHERE quiz_id = $1",
          [quiz_id]
        );

        const currentQuestions = currentQuestionsResult.rows;

        // Determine new questions
        const newQuestions = questions.filter((newQuestion) => {
          return !currentQuestions.some((existingQuestion) => {
            return (
              newQuestion.question === existingQuestion.question &&
              JSON.stringify(newQuestion.options.sort()) ===
                JSON.stringify(
                  [
                    existingQuestion.question_ans1,
                    existingQuestion.question_ans2,
                    existingQuestion.question_ans3,
                    existingQuestion.question_ans4,
                  ].sort()
                )
            );
          });
        });

        // Insert new questions
        for (const newQuestion of newQuestions) {
          await client.query(
            "CALL insert_question2($1, $2, $3, $4, $5, $6, $7, $8)",
            [
              quiz_id,
              newQuestion.question,
              newQuestion.options[0],
              newQuestion.options[1],
              newQuestion.options[2],
              newQuestion.options[3],
              newQuestion.correct_answer,
              newQuestion.active,
            ]
          );
        }
        // Deactivate questions
        for (const question of questions) {
          const currentQuestion = currentQuestions.find(
            (q) => q.question_id === question.question_id
          );
          if (currentQuestion && currentQuestion.active && !question.active) {
            await client.query(
              "UPDATE questions SET active = false WHERE question_id = $1",
              [question.question_id]
            );
          }
        }

        return res.status(200).json({ message: "Quiz updated successfully" });
      } else {
        // The session was created more than 2 hours ago
        return res.status(401).json({ message: "Session expired" });
      }
    } else {
      // No session found
      return res.status(401).json({ message: "Invalid session key" });
    }
  } catch (error) {
    console.error("Error updating quiz:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}

async function postTopic(req, res) {
  console.log("Creating topic");
  const sessionKey = req.headers.sessionkey;
  console.log("Session", req.headers);
  console.log("Session key", sessionKey);

  try {
    // Check if session is valid
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

        // Extract data from request body
        const { topic_name } = req.body;
        if (!topic_name) {
          return res.status(400).json({ message: "Missing topic_name" });
        }

        // Insert topic
        await client.query("INSERT INTO topics (topic_name) VALUES ($1)", [
          topic_name,
        ]);

        return res.status(201).json({ message: "Topic created successfully" });
      } else {
        // The session was created more than 2 hours ago
        return res.status(401).json({ message: "Session expired" });
      }
    } else {
      // No session found
      return res.status(401).json({ message: "Invalid session key" });
    }
  } catch (error) {
    console.error("Error creating topic:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
}


export { getQuizes, getQuizById, createQuiz, getTopics, updateQuiz, postTopic };

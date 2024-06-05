import client from "../helpers/postgres.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// this file is to have the controlers for each route

async function postResponse(req, res) {
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

  console.log("START POST RESPONSE");
  try {
    const { quizId, userId, responses } = req.body;
    console.log("RESPONSES", req.body);
    console.log(quizId, userId, responses);

    //   Pull the quiz data
    let quizData;
    try {
      quizData = await client.query(
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
        [quizId]
      );
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error getting quiz data" });
    }

    // Extract quiz data from the first row

    const quizData2 = {
      quiz_id: quizData.rows[0].quiz_id,
      admin_id: quizData.rows[0].admin_id,
      topic_id: quizData.rows[0].topic_id,
      quiz_name: quizData.rows[0].quiz_name,
      topic_name: quizData.rows[0].topic_name,
    };

    function findResponse(questionId, type) {
      let ans = responses.find(
        (response) => response.questionId === questionId
      );
      if (!ans) {
        console.log(`No response found for questionId ${questionId}`);
        return null;
      }
      if (type === "confidence") {
        return ans.confidence;
      }
      if (type === "answer") {
        return ans.answer;
      }

      return ans;
    }
    // Extract question data and user responses
    const questions = quizData.rows.map((row) => {
      // Find the user's response for this question
      console.log("question_id", row.question_id);
      let answer = findResponse(row.question_id, "answer");
      let confidence = findResponse(row.question_id, "confidence");

      return {
        question_id: row.question_id,
        question: row.question,
        question_ans1: row.question_ans1,
        question_ans2: row.question_ans2,
        question_ans3: row.question_ans3,
        question_ans4: row.question_ans4,
        correct_answer: row.correct_answer,
        active: row.active,
        // Add user response here
        user_response: answer,
        user_confidence: confidence,
      };
    });

    let score = 0;
    const totalQuestions = responses.length; // Assuming responses array has all the questions

    for (const response of responses) {
      const questionResult = await client.query(
        "SELECT correct_answer FROM questions WHERE question_id = $1",
        [response.questionId]
      );

      if (questionResult.rows.length > 0) {
        const correctAnswer = questionResult.rows[0].correct_answer;
        if (response.answer === correctAnswer) {
          score += 1; // Assuming each correct answer gives 1 point
        }
      }
    }

    // Calculate the percentage of correct answers
    const percentageCorrect = (score / totalQuestions) * 100;

    // Convert the percentage to a string
    const scoreString = `${percentageCorrect}%`;

    console.log(scoreString); // Prints the score as a percentage

    // Combine quiz data and questions
    const processedData = {
      ...quizData2,
      questions,
      scoreString,
    };

    console.log("DATA", processedData);

    // Convert the object to a JSON string
    const jsonString = JSON.stringify(processedData);

    let prompt =
      "Tengo este estudiante presento un quiz y su informaicion esta en el json anterior dame un reporte completo. Resumen general del quiz de un parrafo habla de el rendimiento del alumno y los temas del quiz, Despues final haz un plan de estudio para mejorar y una seccion de informacion relevante en el que hables de todos los temas que se tratan en el quiz, un parrafo por cada tema de pregunta " +
      jsonString;

    // Call Gemini AI API for analysis
    const analysis = await sendToGemini(prompt);

    await client.query("BEGIN");

    // Insert the answer report
    const answerReportResult = await client.query(
      "INSERT INTO answer_reports (quiz_id, user_id, analysis, score) VALUES ($1, $2, $3, $4) RETURNING report_id",
      [quizId, userId, analysis, score]
    );
    const reportId = answerReportResult.rows[0].report_id;

    // Insert the responses
    console.log("RESPONSES", responses);
    for (const response of responses) {
      console.log(response);
      await client.query(
        "INSERT INTO responses (report_id, answer, question_id, confidence, quiz_id) VALUES ($1, $2, $3, $4, $5)",
        [
          reportId,
          response.answer,
          response.questionId,
          response.confidence,
          quizId,
        ]
      );
    }

    await client.query("COMMIT");

    res
      .status(201)
      .json({ message: "Answer report created successfully", reportId });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Error creating answer report" });
  }
}

// Function to call Gemini AI API
async function sendToGemini(prompt) {
  console.log(genAI);

  console.log("Sending to Gemini");
  // For text-only input, use the gemini-pro model
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  console.log(text);

  // Return a JSON object
  return text;
}

async function getResponse(req, res) {
  const sessionKey = req.headers.sessionkey;
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
    const reportId = req.params.id;
    console.log(reportId);

    // Fetch the answer report
    const reportResult = await client.query(
      "SELECT * FROM answer_reports WHERE report_id = $1",
      [reportId]
    );
    console.log(reportResult.rows);

    if (reportResult.rows.length === 0) {
      res.status(404).json({ message: "Answer report not found" });
      return;
    }

    const report = reportResult.rows[0];

    // Fetch the responses and their corresponding questions
    const responsesResult = await client.query(
      `SELECT
          r.*,
          q.question,
          q.question_ans1,
          q.question_ans2,
          q.question_ans3,
          q.question_ans4,
          q.correct_answer,
          q.active
       FROM
          responses r
       INNER JOIN
          questions q ON r.question_id = q.question_id
       WHERE
          r.report_id = $1`,
      [reportId]
    );
    console.log(responsesResult.rows);

    const responses = responsesResult.rows;

    res.status(200).json({ report, responses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error getting answer report" });
  }
}

async function getResponseByUser(req, res) {
  const id = req.params.id;
  const sessionKey = req.headers.sessionkey;
  console.log("Session key", sessionKey);
  console.log("Getting responses for user ID", id);
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
    const response = await client.query(
      `SELECT
              ar.report_id,
              ar.quiz_id,
              q.quiz_name,
              ar.user_id,
              u.user_name AS user_name,
              ar.created_at,
              a.user_name AS author_name,
              t.topic_name
           FROM
              answer_reports ar
           INNER JOIN
              quiz q ON ar.quiz_id = q.quiz_id
           INNER JOIN
              users u ON ar.user_id = u.user_id
           INNER JOIN
              users a ON q.admin_id = a.user_id
           INNER JOIN
              topics t ON q.topic_id = t.topic_id
           WHERE
              ar.user_id = $1`,
      [id]
    );

    res.status(200).json(response.rows);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching responses" });
  }
}

async function getResponseByQuiz(req, res) {
  const id = req.params.id;
  console.log("Getting responses for quiz ID", id);

  const sessionKey = req.headers.sessionkey;
  // Check if the session key is valid
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
      // Continue with the request
    } else {
      // The session was created more than 2 hours ago
      return res.status(401).json({ message: "Session expired" });
    }
  } else {
    // No session found
    return res.status(401).json({ message: "Invalid session key" });
  }

  try {
    // Fetch quiz information and questions
    const quizResult = await client.query(
      `SELECT
      q.quiz_id,
      q.quiz_name,
      q.admin_id,
      a.user_name AS author_name,
      q.topic_id,
      t.topic_name,
      qu.question_id,
      qu.question AS question_text,
      qu.question_ans1,
      qu.question_ans2,
      qu.question_ans3,
      qu.question_ans4,
      qu.correct_answer,
      qu.active AS question_active
   FROM
      quiz q
   INNER JOIN
      users a ON q.admin_id = a.user_id
   INNER JOIN
      topics t ON q.topic_id = t.topic_id
   LEFT JOIN
      questions qu ON q.quiz_id = qu.quiz_id
   WHERE
      q.quiz_id = $1`,
      [id]
    );

    if (quizResult.rows.length === 0) {
      return res.status(404).json({ error: "Quiz not found" });
    }

    const quizData = {
      quiz_id: quizResult.rows[0].quiz_id,
      quiz_name: quizResult.rows[0].quiz_name,
      admin_id: quizResult.rows[0].admin_id,
      author_name: quizResult.rows[0].author_name,
      topic_id: quizResult.rows[0].topic_id,
      topic_name: quizResult.rows[0].topic_name,
      questions: quizResult.rows
        .map((row) => ({
          question_id: row.question_id,
          question_text: row.question_text,
          question_ans1: row.question_ans1,
          question_ans2: row.question_ans2,
          question_ans3: row.question_ans3,
          question_ans4: row.question_ans4,
          correct_answer: row.correct_answer,
          active: row.question_active,
        }))
        .filter((q) => q.question_id !== null),
      QuizStats: {
        average_score: 0,
        average_confidence: 0,
        averagePerformance: 0,
      },
    };

    // Fetch reports and their responses
    const responseResult = await client.query(
      `SELECT
          ar.report_id,
          ar.quiz_id,
          ar.user_id,
          u.user_name AS user_name,
          ar.created_at,
          r.response_id,
          r.question_id,
          q_info.question AS question_text,
          r.answer AS user_answer,
          r.confidence AS user_confidence,
          ar.score AS user_score,
          ar.analysis AS report_analysis
       FROM
          answer_reports ar
       INNER JOIN
          users u ON ar.user_id = u.user_id
       INNER JOIN
          responses r ON ar.report_id = r.report_id
       INNER JOIN
          questions q_info ON r.question_id = q_info.question_id
       WHERE
          ar.quiz_id = $1 AND r.question_id IN (SELECT question_id FROM questions WHERE quiz_id = $1)`,
      [id]
    );

    const reportsMap = new Map();
    let totalScore = 0;
    let totalConfidence = 0;
    let totalReports = 0;

    responseResult.rows.forEach((row) => {
      if (!reportsMap.has(row.report_id)) {
        reportsMap.set(row.report_id, {
          report_id: row.report_id,
          quiz_id: row.quiz_id,
          user_id: row.user_id,
          user_name: row.user_name,
          created_at: row.created_at,
          user_score: row.user_score,
          report_analysis: row.report_analysis,
          responses: [],
        });
        totalScore += row.user_score;
        totalReports++;
      }

      reportsMap.get(row.report_id).responses.push({
        response_id: row.response_id,
        question_id: row.question_id,
        question_text: row.question_text,
        user_answer: row.user_answer,
        user_confidence: row.user_confidence,
      });

      totalConfidence += row.user_confidence;
    });

    const reports = Array.from(reportsMap.values());
    // Calculate averages
    const quizLength = quizData.questions.length;

    const numResponses = responseResult.rows.length / quizLength;
    const averageScore = responseResult.rows.length
      ? Math.round((100 / quizLength) * (totalScore / numResponses))
      : 0;
    const averageConfidence = responseResult.rows.length
      ? Math.round((totalConfidence / responseResult.rows.length) * 10)
      : 0;
    const averagePerformance = responseResult.rows.length
      ? Math.round((averageConfidence + averageScore) / 2)
      : 0;

    // Update quiz stats
    quizData.QuizStats.average_score = averageScore;
    quizData.QuizStats.average_confidence = averageConfidence;
    quizData.QuizStats.averagePerformance = averagePerformance;

    // Combine quiz data and reports
    const result = {
      QuizData: quizData,
      QuizSubmissions: reports,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching responses" });
  }
}

export { postResponse, getResponse, getResponseByUser, getResponseByQuiz };

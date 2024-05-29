const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// this file is to have the controlers for each route

async function postResponse(req, res) {
  console.log("START POST RESPONSE");
  try {
    const { quizId, userId, responses } = req.body;
    console.log("RESPONSES",req.body);
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
  let ans= responses.find(response => response.questionId === questionId);
  if (!ans) {
    console.log(`No response found for questionId ${questionId}`);
    return null;
  }
  if(type === "confidence"){
    return ans.confidence;
  }if(type === "answer"){
    return ans.answer;
  }

  return ans;
}
// Extract question data and user responses
const questions = quizData.rows.map(row => {
  // Find the user's response for this question
  console.log("question_id",row.question_id);
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

console.log("DATA",processedData);





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
    console.log("RESPONSES",responses);
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
  console.log("Getting responses for user ID", id);

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
      res.status(500).json({ error: "An error occurred while fetching responses" });
  }
}



exports.postResponse = postResponse;
exports.getResponse = getResponse;
exports.getResponseByUser = getResponseByUser;

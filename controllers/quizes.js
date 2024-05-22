const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");

// this file is to have the controlers for each route

async function getQuizes(req, res) {
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
        console.log("Request params", req.params.id);
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
                    console.log("Query result", result.rows);

                    // Group questions by quiz
                    const quizData = {
                        quiz_id: result.rows[0].quiz_id,
                        admin_id: result.rows[0].admin_id,
                        topic_id: result.rows[0].topic_id,
                        quiz_name: result.rows[0].quiz_name,
                        topic_name: result.rows[0].topic_name,
                        questions: result.rows.filter(row => row.question_id !== null).map(row => ({
                            question_id: row.question_id,
                            question: row.question,
                            options: [
                                row.question_ans1,
                                row.question_ans2,
                                row.question_ans3,
                                row.question_ans4,
                            ],
                            correct_answer: row.correct_answer,
                            active: row.active
                        }))
                    };

                    res.status(200).json(quizData);
                }
            } finally {
            }
        }


    async function createQuiz(req, res) {
        try {
            const { adminId, topicId, name, questions } = req.body;

            await client.query('BEGIN')

            // Insert the quiz
            const quizResult = await client.query(
                'INSERT INTO quiz (admin_id, topic_id, quiz_name) VALUES ($1, $2, $3) RETURNING quiz_id',
                [adminId, topicId, name]
            );
            const quizId = quizResult.rows[0].quiz_id;

            // Insert the questions
            const questionPromises = questions.map((q) =>
                client.query(
                    'INSERT INTO questions (quiz_id, question, question_ans1, question_ans2, question_ans3, question_ans4, correct_answer, active) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                    [quizId, q.question, q.opcion1, q.opcion2, q.opcion3, q.opcion4, q.answer, q.active]
                )
            );

            await Promise.all(questionPromises);

            await client.query('COMMIT');

            res.status(201).send({ message: 'Quiz created successfully', quizId: quizId });
        } catch (error) {
            await client.query('ROLLBACK');
            console.error(error);
            res.status(500).send({ message: 'Error creating quiz' });
        }
    }



exports.getQuizes = getQuizes;
exports.getQuizById = getQuizById;
exports.createQuiz = createQuiz;

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
        client.query(
            "SELECT quiz.*, topics.topic_name, questions.question_id, questions.answers, questions.correct_answer, questions.active FROM quiz INNER JOIN topics ON quiz.topic_id = topics.topic_id LEFT JOIN questions ON quiz.quiz_id = questions.quiz_id WHERE quiz.quiz_id = $1",
            [id],
            (err, result) => {
                if (err) {
                    console.log("Error executing query", err);
                    res.status(500).json({ message: "Error executing query" });
                } else {
                    if (result.rows.length === 0) {
                        res.status(404).json({ message: "This quiz does not exist" });
                    } else {
                        console.log("Query result", result.rows);
                        // Group questions by quiz
                        const quizData = {
                            quiz: {
                                quiz_id: result.rows[0].quiz_id,
                                admin_id: result.rows[0].admin_id,
                                topic_id: result.rows[0].topic_id,
                                topic_name: result.rows[0].topic_name,
                                questions: result.rows.filter(row => row.question_id !== null).map(row => ({
                                    question_id: row.question_id,
                                    answers: row.answers,
                                    correct_answer: row.correct_answer,
                                    active: row.active
                                }))
                            }
                        };
                        res.status(200).json(quizData);
                    }
                }
            }
        );
    }



exports.getQuizes = getQuizes;
exports.getQuizById = getQuizById;

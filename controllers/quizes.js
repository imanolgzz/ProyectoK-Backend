const express = require("express");
const router = express.Router();
const client = require("../helpers/postgres.ts");

// this file is to have the controlers for each route

async function getQuizes(req, res) {
    client.query("SELECT * FROM quiz", (err, result) => {
        if (err) {
        console.log("Error executing query", err);
        res.status(500).json({ message: "Error executing query" });
        } else {
        console.log("Query result", result.rows);
        res.status(200).json(result.rows);
        }
    });
    }

async function getQuizById(req, res) {
    console.log("Request params", req.params.id);
    const id = req.params.id;
    client.query(
        "SELECT * FROM quiz WHERE quiz_id = $1",
        [id],
        (err, result) => {
        if (err) {
            console.log("Quiz does not exist", err);
            res.status(500).json({ message: "Error executing query" });
        } else {
            if (result.rows.length === 0) {
            res.status(404).json({ message: "this quiz does not exist" });
            } else {
            console.log("Query result", result.rows);
            res.status(200).json(result.rows);
            }
        }
        }
    );
}

exports.getQuizes = getQuizes;
exports.getQuizById = getQuizById;

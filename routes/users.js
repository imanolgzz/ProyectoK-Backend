const express = require("express")
const router = express.Router()
const client = require('../helpers/postgres.ts')

router.get('/', (req, res) => {
  client.query('SELECT * FROM users', (err, result) => {
    if (err) {
      console.log("Error executing query", err)
      res.status(500).json({message: "Error executing query"})
    } else {
      console.log("Query result", result.rows)
      res.status(200).json(result.rows)
    }
  })
})

module.exports = router
const express = require('express')
const {Client} = require('pg')
const app = express()
const port = 5000

const client = new Client({
  user: "postgres",
  password: "120820061418",
  host: "192.168.137.138",
  port: "5432",
  database: "projectK"
})

client.connect()
  .then(() => {console.log("Connnected to PostgreSQL database")})
  .catch((err) => {console.log("Error connecting to PostgreSQL database", err)})

app.get('/', (req, res) => {
  console.log("Route / is working fine")
  res.status(200).json({message: "It´s working fine"})
});

const users = require('./routes/users')
app.use('/users', users)

app.listen(5000);
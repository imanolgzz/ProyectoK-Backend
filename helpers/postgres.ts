require('dotenv').config()
const {Client} = require('pg')
const client = new Client({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST,
  port: "5432",
  database: "projectK"
})

client.connect()
  .then(() => {console.log("Connnected to PostgreSQL database")})
  .catch((err) => {console.log("Error connecting to PostgreSQL database", err)})

module.exports = client

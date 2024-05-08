const express = require('express')
const app = express()
const port = 2024


app.get('/', (req, res) => {
  console.log("Route / is working fine")
  res.status(200).json({message: "It´s working fine"})
});

const users = require('./routes/users')
app.use('/users', users)

app.listen(port);
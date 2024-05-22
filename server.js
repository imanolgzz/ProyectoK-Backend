const express = require('express')
const cors = require('cors')
const app = express()
const port = 2024


app.get('/', (req, res) => {
  console.log("Route / is working fine")
  res.status(200).json({message: "It´s working fine"})
});
// to read json body
app.use(express.json());
// to allow client to access the server local
app.use(cors());

//routes
const users = require('./routes/users')
app.use('/users', users)

const quizes = require('./routes/quizes')
app.use('/quizes', quizes)


const responses = require('./routes/responses')
app.use('/responses', responses)

app.listen(port);
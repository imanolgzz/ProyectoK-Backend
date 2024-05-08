const express = require('express');
const app = express();
const port = 5000;

app.get('/', (req, res) => {
  console.log("Route / is working fine");
  res.status(200).json({message: "It´s working fine"});
});

app.listen(5000);
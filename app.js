import express from 'express';
import cors from 'cors';
import users from './routes/users.js';
import quizes from './routes/quizes.js';
import responses from './routes/responses.js';
import chatbot from './routes/chatbot.js';

const app = express();
const port = 2025;

// to read json body
app.use(express.json());
// to allow client to access the server local
app.use(cors());

app.get('/', (req, res) => {
  console.log("Route / is working fine")
  res.status(200).json({message: "It´s working fine"})
});

// routes
app.use('/users', users);
app.use('/quizes', quizes);
app.use('/responses', responses);
app.use('/chatbot', chatbot);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
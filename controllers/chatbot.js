import client from "../helpers/postgres.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Access your API key as an environment variable (see "Set up your API key" above)
const genAI = new GoogleGenerativeAI(process.env.API_KEY);

// this file is to have the controlers for each route
async function sendMessage(req, res) {
    console.log("Sending message");
    console.log(req.body);
  const sessionKey = req.body.headers.sessionKey;
  console.log("Session key", sessionKey);

  // check if the session key is valid
  const sessionResult = await client.query(
    "SELECT * FROM sessions WHERE session_key = $1",
    [sessionKey]
  );

  const history = req.body.data.history;
  const message = req.body.data.message;

  if (sessionResult.rows.length > 0) {
    const session = sessionResult.rows[0];
    const createdAt = new Date(session.created_at);
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    if (createdAt >= twoHoursAgo) {
      // The session was created less than 2 hours ago
      // continue with the request
    } else {
      // The session was created more than 2 hours ago
      return res.status(401).json({ message: "Session expired" });
    }
  } else {
    // No session found
    return res.status(401).json({ message: "Invalid session key" });
  }
  console.log("SENDING TO GEMINI")
  console.log("History", history);
    console.log("Message", message);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: history,
      generationConfig: { maxOutputTokens:300}
    }
    );
    const msg = message;
    const result = await chat.sendMessage(msg);
    const response = await result.response;
    const text = response.text();
    console.log(text);
    res.status(200).json({ message: text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error sending message to gemini" });
  }
}


export { sendMessage };

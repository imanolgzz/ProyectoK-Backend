import dotenv from 'dotenv';
import pkg from 'pg';
const { Client } = pkg;

dotenv.config();

const config = {
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    database: process.env.POSTGRES_DB,
    ssl: false
};

const client = new Client(config);

client.connect()
  .then(() => {
    console.log("Connected to PostgreSQL database");
    return client.query("SELECT VERSION()");
  })
  .then((result) => {
    console.log(result.rows[0].version);
  })
  .catch((err) => {
    console.error("Error connecting to PostgreSQL database", err);
  });

export default client;

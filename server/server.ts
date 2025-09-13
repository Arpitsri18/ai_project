import express, { Application, Request, Response } from 'express';
import dotenv from 'dotenv';

// Configure dotenv
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Middleware to parse incoming JSON data
app.use(express.json());

// Main route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello from the backend!');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
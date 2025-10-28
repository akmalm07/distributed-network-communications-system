import { PORT, HOST } from "./constant.js";
import express from "express";
import type { Request, Response } from "express";
import { Relay } from "./relay.js";

const relay = new Relay();

const app = express();

// Middleware for JSON
app.use(express.json());

// Routes
app.get("/", (req: Request, res: Response) => {
    res.send("Hello, TypeScript + Express!");
});


// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://${HOST}:${PORT}`);
});

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const { AzureOpenAI } = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security & middleware ──────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // allow inline scripts in our own HTML
  })
);
app.use(cors());
app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

// Rate limiter: max 30 requests per minute per IP on the chat endpoint
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: "Too many requests. Please slow down." },
});

// ── Azure OpenAI client ────────────────────────────────────────────────────────
const client = new AzureOpenAI({
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,        // https://crashcoursesharmaprashant.openai.azure.com
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-05-01-preview",
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini",
});

const DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-mini";

const SYSTEM_PROMPT = `You are a friendly and professional customer support assistant. 
Your job is to help customers with their questions and issues in a clear, concise, and empathetic manner.
Always:
- Greet customers warmly
- Understand the issue fully before responding
- Provide step-by-step guidance when needed
- Escalate complex issues politely
- Keep responses concise but thorough
- Maintain a positive, helpful tone throughout`;

// ── Chat endpoint ──────────────────────────────────────────────────────────────
app.post("/api/chat", chatLimiter, async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid messages format." });
  }

  // Build conversation with system prompt prepended
  const conversation = [
    { role: "system", content: SYSTEM_PROMPT },
    ...messages.slice(-20), // keep last 20 messages for context
  ];

  try {
    const response = await client.chat.completions.create({
      model: DEPLOYMENT,
      messages: conversation,
      max_completion_tokens: 800,
      temperature: 1,
      stream: true,
    });

    // Set SSE headers for streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullContent = "";

    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ done: true, fullContent })}\n\n`);
    res.end();
  } catch (err) {
    console.error("Azure OpenAI error:", err?.message || err);

    const status = err?.status || 500;
    const message =
      err?.message?.includes("API key")
        ? "Invalid API key. Please check your configuration."
        : err?.message?.includes("model")
        ? "Model not found. Please verify the deployment name."
        : "Sorry, something went wrong. Please try again.";

    if (!res.headersSent) {
      res.status(status).json({ error: message });
    } else {
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
});

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    deployment: DEPLOYMENT,
    endpoint: process.env.AZURE_OPENAI_ENDPOINT,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-05-01-preview",
  });
});

// ── Serve frontend for all other routes ───────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🤖 Customer Support Bot running at http://localhost:${PORT}`);
  console.log(`📡 Azure endpoint : ${process.env.AZURE_OPENAI_ENDPOINT}`);
  console.log(`🔖 API version    : ${process.env.AZURE_OPENAI_API_VERSION || "2024-05-01-preview"}`);
  console.log(`🚀 Deployment     : ${DEPLOYMENT}\n`);
});

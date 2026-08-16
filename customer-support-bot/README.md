# 🤖 SupportAI — Customer Support Bot

A full-stack AI-powered customer support chatbot built with **Node.js + Express** on the backend and a beautiful **dark-themed chat UI** on the frontend. Powered by your fine-tuned GPT model on **Azure OpenAI (AI Foundry)**.

---

## ✨ Features

- 🎨 **Polished dark UI** — looks and feels like a real product
- 💬 **Streaming responses** — text appears in real-time as the AI generates it
- 🧠 **Conversation memory** — full chat history preserved within a session
- 💾 **Persistent chats** — conversations saved to localStorage, accessible from sidebar
- 📋 **Copy messages** — one-click copy for any AI response
- 📱 **Fully responsive** — works on mobile, tablet, and desktop
- 🚦 **Rate limiting** — 30 requests/min per IP to prevent abuse
- 🔒 **Security headers** via Helmet
- ✅ **Health check endpoint** at `/api/health`

---

## 🚀 Setup & Running

### 1. Install dependencies
```bash
cd customer-support-bot
npm install
```

### 2. Configure your API key
Create a `.env` file in the `customer-support-bot/` directory:
```env
AZURE_OPENAI_ENDPOINT=https://crashcoursesharmaprashant.openai.azure.com
AZURE_OPENAI_API_KEY=YOUR_ACTUAL_API_KEY_HERE
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
AZURE_OPENAI_API_VERSION=2024-05-01-preview
PORT=3000
```

> ⚠️ **Never commit your `.env` file to git.** It's already in `.gitignore`.

### 3. Run the app
```bash
# Production
npm start

# Development (auto-restart on file changes)
npm run dev
```

### 4. Open in browser
```
http://localhost:3000
```

---

## 📁 Project Structure

```
customer-support-bot/
├── server.js          ← Express backend + Azure OpenAI integration
├── package.json
├── .env               ← Your secrets (not committed to git)
├── .env.example       ← Template for .env
└── public/
    ├── index.html     ← App shell + markup
    ├── style.css      ← All styles (dark theme)
    └── app.js         ← Frontend logic (streaming, chat, sidebar)
```

---

## 🔑 Getting Your Azure API Key

1. Go to [Azure AI Foundry](https://ai.azure.com)
2. Open your project → **Settings** or **Keys & Endpoints**
3. Copy the **API Key** and paste it in your `.env` file

---

## 🛠️ Customising the Bot

To change the bot's personality/instructions, edit the `SYSTEM_PROMPT` constant in [`server.js`](server.js):

```js
const SYSTEM_PROMPT = `You are a friendly and professional customer support assistant...`;
```

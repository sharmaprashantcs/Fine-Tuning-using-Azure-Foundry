# Fine Tuning using Azure Foundry

A full-stack AI-powered **customer support chatbot** built on a **fine-tuned GPT model** deployed via **Azure AI Foundry** (Azure OpenAI).

## 🗂 Project Structure

```
customer-support-bot/
├── server.js          ← Express backend + Azure OpenAI streaming integration
├── package.json
├── .env.example       ← Config template (copy to .env and add your key)
└── public/
    ├── index.html     ← Chat UI shell
    ├── style.css      ← Dark theme styles
    └── app.js         ← Frontend logic (streaming, sidebar, history)
```

## 🚀 Quick Start

```bash
cd customer-support-bot
npm install

# Copy the example env file and fill in your Azure key
copy .env.example .env   # then edit .env

npm start
# → http://localhost:3000
```

## ⚙️ Environment Variables

| Variable | Value |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://<your-resource>.openai.azure.com` |
| `AZURE_OPENAI_API_KEY` | Your Azure OpenAI key |
| `AZURE_OPENAI_DEPLOYMENT` | Your fine-tuned deployment name |
| `AZURE_OPENAI_API_VERSION` | `2024-05-01-preview` |
| `PORT` | `3000` (default) |

## ✨ Features

- 🎨 Polished dark chat UI (sidebar, message bubbles, suggestion cards)
- ⚡ Real-time streaming responses (token by token)
- 💾 Persistent chat history via localStorage
- 📋 One-click copy on every AI response
- 📱 Fully responsive — mobile, tablet, desktop
- 🔒 Rate limiting + Helmet security headers
- 🤖 Configurable system prompt in `server.js`

## 🛠 Tech Stack

- **Backend**: Node.js, Express, `openai` SDK (AzureOpenAI client)
- **Frontend**: Vanilla HTML/CSS/JavaScript (no framework, no build step)
- **AI**: Azure OpenAI — fine-tuned GPT model via Azure AI Foundry

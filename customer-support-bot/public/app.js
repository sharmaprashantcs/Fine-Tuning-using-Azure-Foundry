/* ── State ──────────────────────────────────────────────────────────────────── */
const state = {
  conversations: JSON.parse(localStorage.getItem("conversations") || "[]"),
  activeId: null,
  messages: [],          // { role, content }
  isStreaming: false,
};

/* ── DOM refs ───────────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const messagesEl    = $("messages");
const welcomeEl     = $("welcomeScreen");
const chatWindowEl  = $("chatWindow");
const inputEl       = $("userInput");
const sendBtnEl     = $("sendBtn");
const charCountEl   = $("charCount");
const chatHistoryEl = $("chatHistory");
const agentStatusEl = $("agentStatus");
const sidebarEl     = $("sidebar");
const overlayEl     = $("overlay");

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(ts) {
  return new Intl.DateTimeFormat("en", { hour: "2-digit", minute: "2-digit" }).format(ts);
}

function formatDate(ts) {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

/** Very lightweight markdown → HTML (bold, code, lists, newlines) */
function renderMarkdown(text) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    // code blocks (```...```)
    .replace(/```([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    // inline code
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    // bold
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // italic
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // unordered list items
    .replace(/^\s*[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/gs, m => `<ul>${m}</ul>`)
    // numbered list
    .replace(/^\s*\d+\.\s+(.+)$/gm, "<li>$1</li>")
    // line breaks
    .replace(/\n{2,}/g, "</p><p>")
    .replace(/\n/g, "<br/>");
}

/* ── Conversation persistence ───────────────────────────────────────────────── */
function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(state.conversations));
}

function createConversation(firstMsg) {
  const id = uid();
  const title = firstMsg.length > 45 ? firstMsg.slice(0, 42) + "…" : firstMsg;
  const conv = { id, title, ts: Date.now(), messages: [] };
  state.conversations.unshift(conv);
  saveConversations();
  return id;
}

function getActiveConv() {
  return state.conversations.find(c => c.id === state.activeId);
}

function syncMessagesToConv() {
  const conv = getActiveConv();
  if (conv) {
    conv.messages = [...state.messages];
    saveConversations();
  }
}

/* ── Sidebar history render ─────────────────────────────────────────────────── */
function renderHistory() {
  chatHistoryEl.innerHTML = "";
  if (state.conversations.length === 0) {
    chatHistoryEl.innerHTML = `<p style="font-size:.8rem;color:var(--text-faint);padding:8px 10px">No chats yet</p>`;
    return;
  }
  state.conversations.forEach(conv => {
    const el = document.createElement("div");
    el.className = "history-item" + (conv.id === state.activeId ? " active" : "");
    el.dataset.id = conv.id;
    el.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>${escHtml(conv.title)}</span>
    `;
    el.addEventListener("click", () => loadConversation(conv.id));
    chatHistoryEl.appendChild(el);
  });
}

function escHtml(t) {
  return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

/* ── Load a past conversation ───────────────────────────────────────────────── */
function loadConversation(id) {
  const conv = state.conversations.find(c => c.id === id);
  if (!conv) return;
  state.activeId = id;
  state.messages = [...conv.messages];
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "none";

  // Group by date
  let lastDate = null;
  conv.messages.forEach(m => {
    const ts = m.ts || conv.ts;
    const dateStr = formatDate(ts);
    if (dateStr !== lastDate) {
      lastDate = dateStr;
      appendDateSep(dateStr);
    }
    appendMessageEl(m.role, m.content, ts, false);
  });

  renderHistory();
  scrollToBottom();
  closeSidebar();
}

/* ── New chat ───────────────────────────────────────────────────────────────── */
function startNewChat() {
  state.activeId = null;
  state.messages = [];
  messagesEl.innerHTML = "";
  welcomeEl.style.display = "";
  renderHistory();
  closeSidebar();
  inputEl.focus();
}

/* ── Sidebar toggle ─────────────────────────────────────────────────────────── */
function openSidebar() {
  sidebarEl.classList.add("open");
  overlayEl.classList.add("active");
}
function closeSidebar() {
  sidebarEl.classList.remove("open");
  overlayEl.classList.remove("active");
}

/* ── Date separator ─────────────────────────────────────────────────────────── */
function appendDateSep(label) {
  const el = document.createElement("div");
  el.className = "date-sep";
  el.textContent = label;
  messagesEl.appendChild(el);
}

/* ── Append a message bubble ────────────────────────────────────────────────── */
function appendMessageEl(role, content, ts, animate = true) {
  const isBot = role === "assistant";
  const time = formatTime(ts || Date.now());

  const wrapper = document.createElement("div");
  wrapper.className = `message ${isBot ? "bot" : "user"}`;
  if (!animate) wrapper.style.animation = "none";

  wrapper.innerHTML = `
    <div class="msg-avatar">
      ${isBot
        ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <rect x="3" y="11" width="18" height="10" rx="2"/>
             <path d="M9 11V8a3 3 0 0 1 6 0v3"/>
             <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none"/>
             <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
           </svg>`
        : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
             <circle cx="12" cy="8" r="4"/>
             <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
           </svg>`
      }
    </div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name">${isBot ? "Support Assistant" : "You"}</span>
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble">${isBot ? renderMarkdown(content) : escHtml(content)}</div>
      ${isBot ? `
      <div class="msg-actions">
        <button class="msg-action-btn copy-btn" title="Copy">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          Copy
        </button>
      </div>` : ""}
    </div>
  `;

  // Copy button
  const copyBtn = wrapper.querySelector(".copy-btn");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"/></svg> Copied!`;
        setTimeout(() => {
          copyBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg> Copy`;
        }, 2000);
      });
    });
  }

  messagesEl.appendChild(wrapper);
  return wrapper;
}

/* ── Typing indicator ───────────────────────────────────────────────────────── */
function showTyping() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.id = "typingIndicator";
  el.innerHTML = `
    <div class="msg-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M9 11V8a3 3 0 0 1 6 0v3"/>
        <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name">Support Assistant</span>
      </div>
      <div class="msg-bubble typing-bubble">
        <div class="typing-dots"><span></span><span></span><span></span></div>
      </div>
    </div>
  `;
  messagesEl.appendChild(el);
  scrollToBottom();
  return el;
}

function removeTyping() {
  const el = $("typingIndicator");
  if (el) el.remove();
}

/* ── Streaming message ──────────────────────────────────────────────────────── */
function createStreamingBubble() {
  const el = document.createElement("div");
  el.className = "message bot";
  el.id = "streamingMsg";
  el.innerHTML = `
    <div class="msg-avatar">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="11" width="18" height="10" rx="2"/>
        <path d="M9 11V8a3 3 0 0 1 6 0v3"/>
        <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none"/>
        <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none"/>
      </svg>
    </div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-name">Support Assistant</span>
        <span class="msg-time">${formatTime(Date.now())}</span>
      </div>
      <div class="msg-bubble" id="streamingBubble"></div>
    </div>
  `;
  messagesEl.appendChild(el);
  return el;
}

/* ── Scroll to bottom ───────────────────────────────────────────────────────── */
function scrollToBottom() {
  chatWindowEl.scrollTo({ top: chatWindowEl.scrollHeight, behavior: "smooth" });
}

/* ── Set agent status ───────────────────────────────────────────────────────── */
function setAgentStatus(status) {
  const dot = agentStatusEl.querySelector(".status-dot");
  if (status === "online") {
    dot.className = "status-dot online";
    agentStatusEl.lastChild.textContent = "Online";
  } else if (status === "typing") {
    dot.className = "status-dot typing";
    agentStatusEl.lastChild.textContent = "Typing…";
  }
}

/* ── Send message ───────────────────────────────────────────────────────────── */
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || state.isStreaming) return;

  state.isStreaming = true;
  sendBtnEl.disabled = true;
  inputEl.disabled = true;

  // Hide welcome screen
  welcomeEl.style.display = "none";

  // Create conversation if first message
  const isFirst = !state.activeId;
  if (isFirst) {
    state.activeId = createConversation(text);
    appendDateSep("Today");
  }

  // Add user message to state + UI
  const ts = Date.now();
  state.messages.push({ role: "user", content: text, ts });
  appendMessageEl("user", text, ts);
  inputEl.value = "";
  updateCharCount();
  autoResize();
  scrollToBottom();

  setAgentStatus("typing");
  const typingEl = showTyping();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: state.messages.map(({ role, content }) => ({ role, content })) }),
    });

    removeTyping();

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    // Streaming
    const streamEl = createStreamingBubble();
    const bubbleEl = $("streamingBubble");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const json = line.slice(6).trim();
        if (!json) continue;
        try {
          const data = JSON.parse(json);
          if (data.error) throw new Error(data.error);
          if (data.delta) {
            fullContent += data.delta;
            bubbleEl.innerHTML = renderMarkdown(fullContent) + '<span class="cursor"></span>';
            scrollToBottom();
          }
          if (data.done) {
            // Remove cursor, finalize
            bubbleEl.innerHTML = renderMarkdown(fullContent);
            // Add copy button
            const actions = document.createElement("div");
            actions.className = "msg-actions";
            actions.innerHTML = `
              <button class="msg-action-btn copy-btn" title="Copy">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg> Copy
              </button>
            `;
            streamEl.querySelector(".msg-content").appendChild(actions);
            actions.querySelector(".copy-btn").addEventListener("click", () => {
              navigator.clipboard.writeText(fullContent).then(() => {
                actions.querySelector(".copy-btn").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
                setTimeout(() => {
                  actions.querySelector(".copy-btn").innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
                }, 2000);
              });
            });
          }
        } catch (parseErr) {
          if (parseErr.message !== "Unexpected token") throw parseErr;
        }
      }
    }

    streamEl.removeAttribute("id");
    $("streamingBubble")?.removeAttribute("id");

    // Save to state
    const botTs = Date.now();
    state.messages.push({ role: "assistant", content: fullContent, ts: botTs });
    syncMessagesToConv();
    renderHistory();

  } catch (err) {
    removeTyping();
    showToast("⚠️ " + (err.message || "Connection error. Please try again."));
    console.error("Chat error:", err);
  } finally {
    state.isStreaming = false;
    sendBtnEl.disabled = inputEl.value.trim().length === 0;
    inputEl.disabled = false;
    inputEl.focus();
    setAgentStatus("online");
    scrollToBottom();
  }
}

/* ── Toast notification ─────────────────────────────────────────────────────── */
function showToast(msg) {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

/* ── Textarea auto-resize ───────────────────────────────────────────────────── */
function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

/* ── Char counter ───────────────────────────────────────────────────────────── */
function updateCharCount() {
  const len = inputEl.value.length;
  charCountEl.textContent = `${len} / 2000`;
  charCountEl.className = "char-count" + (len > 1800 ? " limit" : len > 1500 ? " warn" : "");
  sendBtnEl.disabled = len === 0 || state.isStreaming;
}

/* ── Event listeners ────────────────────────────────────────────────────────── */
inputEl.addEventListener("input", () => {
  autoResize();
  updateCharCount();
});

inputEl.addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtnEl.addEventListener("click", sendMessage);

$("newChatBtn").addEventListener("click", startNewChat);

$("clearBtn").addEventListener("click", () => {
  if (state.messages.length === 0) return;
  if (confirm("Clear this conversation?")) startNewChat();
});

$("menuBtn").addEventListener("click", openSidebar);
$("sidebarClose").addEventListener("click", closeSidebar);
overlayEl.addEventListener("click", closeSidebar);

// Suggestion cards
document.querySelectorAll(".suggestion-card").forEach(card => {
  card.addEventListener("click", () => {
    inputEl.value = card.dataset.prompt;
    autoResize();
    updateCharCount();
    inputEl.focus();
    sendMessage();
  });
});

/* ── Init ───────────────────────────────────────────────────────────────────── */
renderHistory();
inputEl.focus();

// Check health
fetch("/api/health")
  .then(r => r.json())
  .then(data => {
    $("modelLabel").textContent = `${data.deployment} · Fine-tuned`;
  })
  .catch(() => {});

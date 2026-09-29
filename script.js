const chat = document.getElementById("chat");
const empty = document.getElementById("empty");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send");

function addMessage(text, kind) {
  if (empty) empty.remove();
  const el = document.createElement("div");
  el.className = "msg " + kind;
  el.textContent = text; // textContent avoids HTML injection
  chat.appendChild(el);
  chat.scrollTop = chat.scrollHeight;
  return el;
}

// Pull readable text out of whatever n8n returns (plain text or JSON).
function extractReply(raw) {
  let data;
  try { data = JSON.parse(raw); } catch { return raw.trim(); }
  if (Array.isArray(data)) data = data[0];
  if (typeof data === "string") return data;
  if (data && typeof data === "object") {
    for (const k of ["output", "text", "message", "response", "reply", "answer"]) {
      if (typeof data[k] === "string" && data[k]) return data[k];
    }
    return JSON.stringify(data, null, 2);
  }
  return String(data ?? "");
}

async function send(text) {
  text = text.trim();
  if (!text || sendBtn.disabled) return;
  if (!N8N_WEBHOOK_URL || N8N_WEBHOOK_URL.includes("YOUR-N8N-DOMAIN")) {
    addMessage("The webhook URL isn't configured yet. Set N8N_WEBHOOK_URL in config.js.", "ai error");
    return;
  }
  addMessage(text, "user");
  input.value = "";
  sendBtn.disabled = true;
  const loading = addMessage("Checking your Gmail...", "ai loading");
  try {
    const res = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const reply = extractReply(await res.text());
    loading.remove();
    addMessage(reply || "The agent returned an empty response.", "ai");
  } catch (err) {
    console.error(err);
    loading.remove();
    addMessage("Sorry, I couldn't reach the assistant. Please try again in a moment.", "ai error");
  } finally {
    sendBtn.disabled = false;
    input.focus();
  }
}

sendBtn.addEventListener("click", () => send(input.value));
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input.value); }
});
document.querySelectorAll(".example").forEach((b) =>
  b.addEventListener("click", () => send(b.textContent))
);
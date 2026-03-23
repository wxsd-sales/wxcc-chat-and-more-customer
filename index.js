const ACCESS_TOKEN = "";
const TO_PERSON_EMAIL = "vvazquez@wxsd.us";

const chatHistory = document.getElementById("chat-history");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const statusEl = document.getElementById("status");

function appendMessage(from, text) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message--${from}`;
  msg.textContent = text;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function setStatus(text) {
  statusEl.textContent = text;
}

// Step 1 — init Webex SDK with the access token
const webex = Webex.init({
  credentials: { access_token: ACCESS_TOKEN },
});
console.log("[WxCC]: Webex SDK initialized");

// Step 2 — start listening for incoming messages
async function initMessaging() {
  try {
    await webex.messages.listen();
    console.log("[WxCC]: messages listening started");
    const me = await webex.people.get("me");
    console.log("[WxCC]: logged in as", me.emails[0]);

    webex.messages.on("created", (event) => {
      console.log("[WxCC]: incoming message", event);
      if (event.data.personEmail === me.emails[0]) return;
      appendMessage("them", event.data.text);
    });
  } catch (error) {
    console.error("[WxCC]: messages listen error:", error);
  }
}

initMessaging();

// Step 3 — send via Webex SDK
async function sendMessage() {
  const text = chatInput.value.trim();
  console.log("[WxCC]: sendMessage called, text:", text);
  if (!text) return;

  appendMessage("me", text);
  chatInput.value = "";
  chatInput.focus();

  try {
    await webex.messages.create({ toPersonEmail: TO_PERSON_EMAIL, text });
    console.log("[WxCC]: message sent successfully");
    setStatus("");
  } catch (error) {
    console.error("[WxCC]: send error:", error);
    setStatus("Message failed to send.");
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

chatHistory.scrollTop = chatHistory.scrollHeight;

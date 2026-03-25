const urlParams = new URLSearchParams(window.location.search);
const ACCESS_TOKEN = urlParams.get("token");
const TO_PERSON_EMAIL = urlParams.get("email") || "vvazquez@wxsd.us";
const VIDEO_DESTINATION = urlParams.get("destination") || "https://wxsd.webex.com/wxsd/j.php?MTID=md2fcfba19d7b995d354add25cf452812";

if (!ACCESS_TOKEN) {
  document.body.innerHTML = "<p style='padding:2rem;font-family:sans-serif;color:red;'>Missing <code>?token=</code> URL parameter.</p>";
  throw new Error("No access token provided");
}

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

// STEP-1: Initialize the Webex SDK with the token from the URL param.
// window.Webex is the UMD bundle loaded via CDN script tag in index.html.
// This does NOT connect yet — the SDK fires "ready" when it's fully initialized.
const webex = window.Webex.init({
  logger: { level: "debug" },
  credentials: { access_token: ACCESS_TOKEN },
});
console.log("[WxCC]: Webex SDK initialized");

// STEP-2: Wait for the SDK to be ready, then register for meetings.
// register() must complete before we can create or join any meeting.
// Only after register() do we start listening for messages (STEP-3).
webex.once("ready", () => {
  console.log("[WxCC]: Webex ready");
  webex.meetings
    .register()
    .then(() => {
      console.log("[WxCC]: meetings registered");
      initMessaging();
    })
    .catch((err) => console.error("[WxCC]: meetings register error", err));
});

// STEP-3: Open a websocket to receive real-time Webex messages.
// We filter out our own messages using our email from webex.people.get("me").
// If the agent sends "/startvideo", we trigger the video join (STEP-4).
async function initMessaging() {
  try {
    await webex.messages.listen();
    console.log("[WxCC]: messages listening started");
    const me = await webex.people.get("me");
    console.log("[WxCC]: logged in as", me.emails[0]);

    webex.messages.on("created", (event) => {
      console.log("[WxCC]: incoming message", event);
      if (event.data.personEmail === me.emails[0]) return;
      const text = event.data.text;
      if (text && text.trim() === "/startvideo") {
        console.log("[WxCC]: /startvideo received, starting video...");
        startVideo();
        return;
      }
      appendMessage("them", text);
    });
  } catch (error) {
    console.error("[WxCC]: messages listen error:", error);
  }
}

// STEP-4: Join the video meeting.
// Triggered by the agent sending "/startvideo" via chat.
// Creates the meeting object, creates local camera/mic streams,
// binds media events, then calls joinWithMedia to actually connect.
async function startVideo() {
  try {
    setStatus("Starting video...");

    // STEP-4a: Create the meeting handle for the video destination.
    const meeting = await webex.meetings.create(VIDEO_DESTINATION);
    console.log("[WxCC]: meeting created", meeting);

    // STEP-4b: Create local camera and microphone streams.
    const microphoneStream = await webex.meetings.mediaHelpers.createMicrophoneStream({
      echoCancellation: true,
      noiseSuppression: true,
    });
    const cameraStream = await webex.meetings.mediaHelpers.createCameraStream({ width: 640, height: 480 });
    console.log("[WxCC]: local streams created");

    // Show the local camera in the self-view element immediately.
    document.getElementById("self-view").srcObject = cameraStream.outputStream;

    // STEP-4c: Bind meeting SDK events BEFORE joining.
    // media:ready fires when remote video/audio streams are available.
    // media:stopped fires when the meeting ends.
    meeting.on("error", (error) => console.error("[WxCC]: meeting error", error));

    meeting.on("media:ready", (media) => {
      console.log("[WxCC]: media:ready", media.type);
      if (media.type === "remoteVideo") {
        document.getElementById("remote-view-video").srcObject = media.stream;
        document.getElementById("video-container").style.display = "";
        document.getElementById("hero-image").style.display = "none";
      } else if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = media.stream;
      }
    });

    meeting.on("media:stopped", (media) => {
      console.log("[WxCC]: media:stopped", media.type);
      if (media.type === "remoteVideo") {
        document.getElementById("remote-view-video").srcObject = null;
      } else if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = null;
      }
    });

    // STEP-4d: Join the meeting with local media streams.
    await meeting.joinWithMedia({
      mediaOptions: {
        allowMediaInLobby: true,
        bundlePolicy: "max-bundle",
        localStreams: {
          camera: cameraStream,
          microphone: microphoneStream,
        },
      },
    });

    console.log("[WxCC]: meeting joined with media");
    setStatus("");
  } catch (error) {
    console.error("[WxCC]: startVideo error:", error);
    console.error("[WxCC]: error name:", error.name);
    console.error("[WxCC]: error message:", error.message);
    console.error("[WxCC]: error stack:", error.stack);
    setStatus("Could not start video.");
  }
}

// STEP-5: Send a chat message to the agent via Webex messages API.
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

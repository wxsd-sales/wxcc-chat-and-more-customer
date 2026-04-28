// const BACKEND_URL = "http://localhost:3000";
const BACKEND_URL = "https://be-guest-and-meeting-creation-production.up.railway.app";
// const WXCC_HOOK_URL = "https://hooks.us.webexconnect.io/events/12IOCZHHTT";
const WXCC_HOOK_URL = "https://hooks.us.webexconnect.io/events/HILBRZW77M";
const VIDEO_DESTINATION = new URLSearchParams(window.location.search).get("destination");

let toPersonEmail = null; // set when first message is received from agent
let VIDEO_DESTINATION_OVERRIDE = null; // set when agent sends /meetinglink
// const INAPP_APP_ID = "VI24093513";
const INAPP_APP_ID = "DA05221332";
const INAPP_USER_ID = "6806ea7s-a04e-4fdb-9d86-0b33626f3577";
const CUSTOMER_EMAIL = "vvazqueza@wxsd.us";

const chatHistory = document.getElementById("chat-history");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const statusEl = document.getElementById("status");

function appendSystemMessage(sender, text) {
  const msg = document.createElement("div");
  msg.className = "chat-message chat-message--system";
  msg.innerHTML = `<span class="system-sender">${sender}</span><em>${text}</em>`;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

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

// STEP-0: Notify WxCC to assign an agent for this customer session.
// Called before SDK init — no auth required.
// Posts customer info to WxCC to request an agent.
// customerEmail — static email for identification
// customerId — the Webex person ID (me.id), used by the agent widget to send chat messages
async function requestAgent(customerName, customerId) {
  // -- OLD: WxCC hook --
  /*
  const mediaType = "video";
  const response = await fetch(WXCC_HOOK_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    customerName,
    customerEmail: CUSTOMER_EMAIL,
    customerId,
    videoCallDestination: VIDEO_DESTINATION,
    "inappmessaging.appId": INAPP_APP_ID,
    "inappmessaging.userId": INAPP_USER_ID,
    mediaType
    }),
  });
  // console.log("[WxCC]: agent request sent, status:", response.status);
  */

  // -- NEW: proxy through BE to avoid CORS --
  const mediaType = "video";
  const response = await fetch(`${BACKEND_URL}/api/request-agent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      customerName,
      customerEmail: CUSTOMER_EMAIL,
      customerId,
      mediaType
    }),
  }); 
  console.log(`[WxCC]: agent request for ${mediaType} sent and ${CUSTOMER_EMAIL}, status:", ${response.status}`);
}

// Returns token from URL param if present, otherwise fetches from backend.
// Passes ?name= to the backend so it can set the guest's display name in the meeting.
async function getAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    console.log("[WxCC]: using token from URL param");
    return urlToken;
  }
  const name = params.get("name") || "Guest";
  console.log("[WxCC]: fetching token from backend for", name);
  const response = await fetch(`${BACKEND_URL}/api/get-token?name=${encodeURIComponent(name)}`);
  const data = await response.json();
  return data.accessToken;
}

async function init() {
  // STEP-1: Get the access token (from URL param or backend), then initialize
  // the Webex SDK. window.Webex is the UMD bundle loaded via CDN in index.html.
  // This does NOT connect yet — the SDK fires "ready" when it's fully initialized.
  const accessToken = await getAccessToken().catch((err) => {
    console.error("[WxCC]: failed to get access token", err);
    return null;
  });

  if (!accessToken) return;

  const webex = window.Webex.init({
    logger: { level: "debug" },
    credentials: { access_token: accessToken },
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
        initMessaging(webex);
      })
      .catch((err) => console.error("[WxCC]: meetings register error", err));
  });

  // STEP-5: Wire up the chat send button.
  chatSend.disabled = true;
  chatSend.style.opacity = "0.4";

  chatSend.addEventListener("click", () => sendMessage(webex));
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendMessage(webex);
  });
}

// STEP-3: Open a websocket to receive real-time Webex messages.
// We filter out our own messages using our email from webex.people.get("me").
// If the agent sends "/startvideo", we trigger the video join (STEP-4).
async function initMessaging(webex) {
  try {
    appendSystemMessage("Concierge", "An Agent will be with you soon; please check back on this browser for assistance. Agent On Demand only accepts payments from authorized credit cards verified during flight check-in.");

    await webex.messages.listen();
    console.log("[WxCC]: messages listening started");
    const me = await webex.people.get("me");
    console.log("[WxCC]: logged in as", me.emails[0]);

    // STEP-0: Now that we have the customer's Webex person ID, request an agent from WxCC.
    // me.id is sent as customerId so the agent widget can use it to send chat messages directly.
    const customerName = new URLSearchParams(window.location.search).get("name") || "Guest";
    await requestAgent(customerName, me.id).catch((err) => console.error("[WxCC]: agent request error", err));

    webex.messages.on("created", (event) => {
      console.log("[WxCC]: incoming message", event);
      if (event.data.personEmail === me.emails[0]) return;

      // Capture agent email from first incoming message and enable send button
      if (!toPersonEmail) {
        toPersonEmail = event.data.personEmail;
        console.log("[WxCC]: agent email set to", toPersonEmail);
        chatSend.disabled = false;
        chatSend.style.opacity = "1";
      }

      const text = event.data.text;
      if (text && text.trim().startsWith("/meetinglink ")) {
        const link = text.trim().substring("/meetinglink ".length);
        console.log("[WxCC]: meeting link received", link);
        VIDEO_DESTINATION_OVERRIDE = link;
        return;
      }
      if (text && text.trim() === "/startvideo") {
        console.log("[WxCC]: /startvideo received, starting video...");
        startVideo(webex);
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
async function startVideo(webex) {
  try {
    setStatus("Starting video...");

    // STEP-4a: Create the meeting handle for the video destination.
    // Use the link sent by the agent if available, otherwise fall back to URL param.
    const destination = VIDEO_DESTINATION_OVERRIDE || VIDEO_DESTINATION;
    console.log("[WxCC]: joining meeting at", destination);
    const meeting = await webex.meetings.create(destination);
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
      } else if (media.type === "remoteShare") {
        // Just assign the stream — show/hide is handled by startedSharingRemote/stoppedSharingRemote
        document.getElementById("remote-share-video").srcObject = media.stream;
        console.log("[WxCC]: remoteShare stream assigned");
      }
    });

    let stoppedStreams = new Set();
    let meetingEnded = false;
    meeting.on("media:stopped", (media) => {
      console.log("[WxCC]: media:stopped", media.type);
      stoppedStreams.add(media.type);
      if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = null;
      } else if (media.type === "remoteShare") {
        document.getElementById("remote-share-video").srcObject = null;
      }
      if (!meetingEnded && stoppedStreams.has("remoteAudio")) {
        meetingEnded = true;
        console.log("[WxCC]: remote audio stopped, meeting ended");
        resetVideoUI();
      }
    });

    meeting.on("meeting:startedSharingRemote", () => {
      console.log("[WxCC]: screen share started on customer side");
      document.getElementById("remote-share-video").style.display = "block";
      document.getElementById("remote-view-video").style.display = "none";
    });

    meeting.on("meeting:stoppedSharingRemote", () => {
      console.log("[WxCC]: screen share stopped on customer side");
      const shareEl = document.getElementById("remote-share-video");
      const temp = shareEl.srcObject;
      shareEl.srcObject = null;
      shareEl.srcObject = temp;
      shareEl.style.display = "none";
      document.getElementById("remote-view-video").style.display = "block";
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

    // Wire up camera, mic and end buttons now that we have a live meeting
    const cameraBtn = document.getElementById("header-camera");
    const micBtn = document.getElementById("header-mic");
    const endBtn = document.getElementById("header-end");

    endBtn.style.display = "";
    endBtn.addEventListener("click", async () => {
      if (toPersonEmail) {
        try {
          await webex.messages.create({ toPersonEmail, text: "Customer ended the meeting" });
          console.log("[WxCC]: end notification sent to agent");
        } catch (e) {
          console.error("[WxCC]: failed to send end notification", e);
        }
      }
      try {
        await meeting.leave();
      } catch (e) {
        // SDK may throw getCurUserType internally but leave still succeeds
      }
      console.log("[WxCC]: meeting left");
      resetVideoUI();
    });

    function resetVideoUI() {
      endBtn.style.display = "none";
      document.getElementById("video-container").style.display = "none";
      document.getElementById("hero-image").style.display = "";
      cameraBtn.style.opacity = "0.4";
      micBtn.style.opacity = "0.4";
    }

    cameraBtn.style.opacity = "1";
    micBtn.style.opacity = "1";

    cameraBtn.addEventListener("click", () => {
      const newMuted = !cameraStream.userMuted;
      cameraStream.setUserMuted(newMuted);
      cameraBtn.style.opacity = newMuted ? "0.4" : "1";
    });

    micBtn.addEventListener("click", () => {
      const newMuted = !microphoneStream.userMuted;
      microphoneStream.setUserMuted(newMuted);
      micBtn.style.opacity = newMuted ? "0.4" : "1";
    });
  } catch (error) {
    console.error("[WxCC]: startVideo error:", error);
    console.error("[WxCC]: error name:", error.name);
    console.error("[WxCC]: error message:", error.message);
    console.error("[WxCC]: error stack:", error.stack);
    setStatus("Could not start video.");
  }
}

// STEP-5: Send a chat message to the agent via Webex messages API.
async function sendMessage(webex) {
  const text = chatInput.value.trim();
  console.log("[WxCC]: sendMessage called, text:", text);
  if (!text) return;

  appendMessage("me", text);
  chatInput.value = "";
  chatInput.focus();

  try {
    await webex.messages.create({ toPersonEmail, text });
    console.log("[WxCC]: message sent successfully");
    setStatus("");
  } catch (error) {
    console.error("[WxCC]: send error:", error);
    setStatus("Message failed to send.");
  }
}

init();

// const BACKEND_URL = "http://localhost:3000";
const BACKEND_URL = "https://be-guest-and-meeting-creation-production.up.railway.app";
const VIDEO_DESTINATION = new URLSearchParams(window.location.search).get("destination");
const CUSTOMER_EMAIL = "vvazquez@cisco.com";

let VIDEO_DESTINATION_OVERRIDE = null; // set when agent sends /meetinglink

const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
}

// STEP-0: Notify WxCC to assign an agent for this customer session.
// Proxied through the BE to avoid CORS issues with the routing API.
const mediaType = "audio";

// Old Live Chat based option
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


// Option for Task Routing API using BW
/* async function requestAgent(customerName, customerId) {
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
  console.log(`[WxCC]: agent request for ${mediaType} sent, status:", ${response.status}`);
} */

// Returns token from URL param if present, otherwise fetches from backend.
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
  // STEP-1: Get the access token, then initialize the Webex SDK.
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
}

// STEP-3: Open a websocket to receive real-time Webex messages.
// If the agent sends "/startvideo", we trigger the audio join (STEP-4).
async function initMessaging(webex) {
  try {
    await webex.messages.listen();
    console.log("[WxCC]: messages listening started");
    const me = await webex.people.get("me");
    console.log("[WxCC]: logged in as", me.emails[0]);

    // STEP-0: Request an agent now that we have the customer's Webex person ID.
    const customerName = new URLSearchParams(window.location.search).get("name") || "Guest";
    await requestAgent(customerName, me.id).catch((err) => console.error("[WxCC]: agent request error", err));

    webex.messages.on("created", (event) => {
      console.log("[WxCC]: incoming message", event);
      if (event.data.personEmail === me.emails[0]) return;

      const text = event.data.text;
      if (text && text.trim().startsWith("/meetinglink ")) {
        const link = text.trim().substring("/meetinglink ".length);
        console.log("[WxCC]: meeting link received", link);
        VIDEO_DESTINATION_OVERRIDE = link;
        return;
      }
      if (text && text.trim() === "/startaudio") {
        console.log("[WxCC]: /startaudio received, starting audio call...");
        startAudio(webex);
        return;
      }
    });
  } catch (error) {
    console.error("[WxCC]: messages listen error:", error);
  }
}

// STEP-4: Join the meeting audio-only.
// Triggered by the agent sending "/startvideo" via chat.
async function startAudio(webex) {
  try {
    setStatus("Connecting...");

    // STEP-4a: Create the meeting handle.
    const destination = VIDEO_DESTINATION_OVERRIDE || VIDEO_DESTINATION;
    console.log("[WxCC]: joining meeting at", destination);
    const meeting = await webex.meetings.create(destination);
    console.log("[WxCC]: meeting created", meeting);

    // STEP-4b: Create microphone stream only — no camera.
    const microphoneStream = await webex.meetings.mediaHelpers.createMicrophoneStream({
      echoCancellation: true,
      noiseSuppression: true,
    });
    console.log("[WxCC]: microphone stream created");

    // STEP-4c: Bind meeting SDK events BEFORE joining.
    meeting.on("error", (error) => console.error("[WxCC]: meeting error", error));

    meeting.on("media:ready", (media) => {
      console.log("[WxCC]: media:ready", media.type);
      if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = media.stream;
        document.getElementById("call-status").classList.add("active");
        document.getElementById("hero-image").style.opacity = "0.5";
      }
    });

    let stoppedStreams = new Set();
    meeting.on("media:stopped", (media) => {
      console.log("[WxCC]: media:stopped", media.type);
      stoppedStreams.add(media.type);
      if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = null;
      }
      // Audio-only: meeting ended when remoteAudio stops
      if (stoppedStreams.has("remoteAudio")) {
        console.log("[WxCC]: remote audio stopped, call ended");
        resetCallUI();
      }
    });

    // STEP-4d: Join with microphone only — no camera stream.
    await meeting.joinWithMedia({
      mediaOptions: {
        allowMediaInLobby: true,
        bundlePolicy: "max-bundle",
        localStreams: {
          microphone: microphoneStream,
        },
      },
    });

    console.log("[WxCC]: meeting joined (audio only)");
    setStatus("");

    // Wire up mic and end buttons
    const micBtn = document.getElementById("header-mic");
    const endBtn = document.getElementById("header-end");

    endBtn.style.display = "";
    endBtn.addEventListener("click", async () => {
      try {
        await meeting.leave();
        console.log("[WxCC]: meeting left");
      } catch (e) {
        console.error("[WxCC]: meeting leave error", e);
      }
      resetCallUI();
    });

    function resetCallUI() {
      endBtn.style.display = "none";
      document.getElementById("call-status").classList.remove("active");
      document.getElementById("hero-image").style.opacity = "1";
      micBtn.style.opacity = "0.4";
    }

    micBtn.style.opacity = "1";

    micBtn.addEventListener("click", () => {
      const newMuted = !microphoneStream.userMuted;
      microphoneStream.setUserMuted(newMuted);
      micBtn.style.opacity = newMuted ? "0.4" : "1";
    });
  } catch (error) {
    console.error("[WxCC]: startAudio error:", error);
    setStatus("Could not connect call.");
  }
}

init();

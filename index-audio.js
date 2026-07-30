// const BACKEND_URL = "http://localhost:3000";
const BACKEND_URL = "https://be-guest-token-and-meeting-creation-103887567970.us-central1.run.app";
const VIDEO_DESTINATION = new URLSearchParams(window.location.search).get("destination");
const CUSTOMER_EMAIL = "vvazquez@cxocoe.us";
const WXCC_HOOK_URL = "https://hooks.us.webexconnect.io/events/HILBRZW77M";
const INAPP_APP_ID = "DA05221332";
const INAPP_USER_ID = "6806ea7s-a04e-4fdb-9d86-0b33626f3577";

let VIDEO_DESTINATION_OVERRIDE = null; // set when agent sends /meetinglink
let activeMeeting = null; // set when meeting is joined, used to handle /endmeeting from agent
// Needed to send messages to guest users: use personId instead of personEmail
let toPersonId = null; // set when first message is received from agent

const statusEl = document.getElementById("status");

function setStatus(text) {
  statusEl.textContent = text;
}
 
// Renders a centered "Take Survey" button on top of the page. Triggered by /survey <url> from the agent.
// Click opens the survey in a new tab; the raw URL is never displayed to the customer.
function showSurveyButton(surveyLink) {
  // Avoid duplicate buttons if /survey is sent more than once
  const existing = document.getElementById("survey-button");
  if (existing) existing.remove();

  const btn = document.createElement("button");
  btn.id = "survey-button";
  btn.textContent = "Take Survey";
  btn.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background-color:#0078d4; color:#fff; border:none; border-radius:24px; padding:14px 28px; cursor:pointer; font-size:1rem; box-shadow:0 4px 12px rgba(0,0,0,0.2); z-index:1000;";
  btn.addEventListener("click", () => {
    console.log("[WxCC]: customer clicked survey button, opening:", surveyLink);
    window.open(surveyLink, "_blank");
  });
  document.body.appendChild(btn);
  console.log("[WxCC]: survey button shown");
}

// STEP-0: Notify WxCC to assign an agent for this customer session.
// Proxied through the BE to avoid CORS issues with the routing API.


async function requestAgent(customerName, customerId) {
  const mediaType = "audio";
  
  /*
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
    });*/

  
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

  console.log(`[WxCC]: agent request to ${BACKEND_URL} for ${mediaType} and ${CUSTOMER_EMAIL} sent, status:", ${response.status}`);
} 

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

      if (!toPersonId) {
        toPersonId = event.data.personId; // Needed to send messages to guest users: personId works for both regular and guest accounts
        console.log("[WxCC]: agent personId set to", toPersonId);
      }

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
      if (text && text.trim() === "/endmeeting") {
        console.log("[WxCC]: /endmeeting received from agent, leaving call...");
        if (activeMeeting) {
          activeMeeting.leave().catch(() => {});
          activeMeeting = null;
        }
        document.getElementById("header-end").style.display = "none";
        document.getElementById("call-status").classList.remove("active");
        document.getElementById("hero-image").style.opacity = "1";
        document.getElementById("header-mic").style.opacity = "0.4";
        return;
      }
      if (text && text.trim().startsWith("/survey ")) {
        const surveyLink = text.trim().substring("/survey ".length);
        console.log("[WxCC]: /survey received, link:", surveyLink);
        showSurveyButton(surveyLink);
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
    activeMeeting = meeting; // Store reference so /endmeeting message handler can call leave()
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

    let meetingEnded = false;
    meeting.on("media:stopped", (media) => {
      console.log("[WxCC]: media:stopped", media.type);
      if (media.type === "remoteAudio") {
        document.getElementById("remote-view-audio").srcObject = null;
      }
      if (!meetingEnded && media.type === "remoteAudio") {
        meetingEnded = true;
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
      if (toPersonId) {
        try {
          await webex.messages.create({ toPersonId, text: "Customer ended the meeting" }); // Needed to send messages to guest users
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
      activeMeeting = null;
      console.log("[WxCC]: meeting left");
      resetCallUI();
    });

    function resetCallUI() {
      activeMeeting = null;
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

// const BACKEND_URL = "http://localhost:3000";
const BACKEND_URL = "https://be-guest-and-meeting-creation-production.up.railway.app";

// Meeting destination comes from the URL param sent in the SMS link.
// e.g. index-screenshare.html?meeting=https://united.webex.com/...&name=John
const MEETING_DESTINATION = new URLSearchParams(window.location.search).get("meeting");
const CUSTOMER_NAME = new URLSearchParams(window.location.search).get("name") || "Guest";

const statusEl = document.getElementById("status");
const joinBtn = document.getElementById("join-btn");

function setStatus(text) {
  statusEl.textContent = text;
}

// Returns token from URL param if present, otherwise fetches from backend.
async function getAccessToken() {
  const params = new URLSearchParams(window.location.search);
  const urlToken = params.get("token");
  if (urlToken) {
    console.log("[WxCC]: using token from URL param");
    return urlToken;
  }
  console.log("[WxCC]: fetching token from backend for", CUSTOMER_NAME);
  const response = await fetch(`${BACKEND_URL}/api/get-token?name=${encodeURIComponent(CUSTOMER_NAME)}`);
  const data = await response.json();
  return data.accessToken;
}

async function init() {
  if (!MEETING_DESTINATION) {
    setStatus("No meeting link provided.");
    joinBtn.disabled = true;
    console.error("[WxCC]: no meeting destination in URL params");
    return;
  }

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
        // Enable join button once SDK is ready
        joinBtn.disabled = false;
        joinBtn.addEventListener("click", () => joinSession(webex));
      })
      .catch((err) => console.error("[WxCC]: meetings register error", err));
  });
}

// STEP-3: Join the meeting with mic only to view the agent's screen share.
// Triggered by the customer tapping "Join Session".
async function joinSession(webex) {
  joinBtn.disabled = true;
  setStatus("Connecting...");

  try {
    // STEP-3a: Create the meeting handle from the link in the URL param.
    console.log("[WxCC]: joining meeting at", MEETING_DESTINATION);
    const meeting = await webex.meetings.create(MEETING_DESTINATION);
    console.log("[WxCC]: meeting created", meeting);

    // STEP-3b: Bind meeting SDK events BEFORE joining.
    // No local audio/video — customer is already on the phone with the agent.
    meeting.on("error", (error) => console.error("[WxCC]: meeting error", error));

    meeting.on("media:ready", (media) => {
      console.log("[WxCC]: media:ready", media.type);
      if (media.type === "remoteShare") {
        document.getElementById("remote-share-video").srcObject = media.stream;
        console.log("[WxCC]: remote share stream assigned");
      }
    });

    meeting.on("media:stopped", (media) => {
      console.log("[WxCC]: media:stopped", media.type);
      if (media.type === "remoteShare") {
        document.getElementById("remote-share-video").srcObject = null;
        console.log("[WxCC]: remote share stopped, session ended");
        resetUI();
      }
    });

    // Show screen share when agent starts sharing, hide hero image
    meeting.on("meeting:startedSharingRemote", () => {
      console.log("[WxCC]: screen share started");
      document.getElementById("remote-share-video").style.display = "block";
      document.getElementById("hero-image").style.display = "none";
      document.getElementById("call-status").classList.add("active");
    });

    // Hide screen share when agent stops sharing, show hero image
    meeting.on("meeting:stoppedSharingRemote", () => {
      console.log("[WxCC]: screen share stopped");
      const shareEl = document.getElementById("remote-share-video");
      const temp = shareEl.srcObject;
      shareEl.srcObject = null;
      shareEl.srcObject = temp;
      shareEl.style.display = "none";
      document.getElementById("hero-image").style.display = "block";
    });

    // STEP-3c: Join with no local streams — view only.
    await meeting.joinWithMedia({
      mediaOptions: {
        allowMediaInLobby: true,
        bundlePolicy: "max-bundle",
        localStreams: {},
      },
    });

    console.log("[WxCC]: meeting joined (screenshare viewer)");
    setStatus("");

    // Hide join button, show end button
    joinBtn.style.display = "none";
    const endBtn = document.getElementById("header-end");

    endBtn.style.display = "";
    endBtn.addEventListener("click", async () => {
      try {
        await meeting.leave();
        console.log("[WxCC]: meeting left");
      } catch (e) {
        console.error("[WxCC]: meeting leave error", e);
      }
      resetUI();
    });

    function resetUI() {
      endBtn.style.display = "none";
      joinBtn.style.display = "";
      joinBtn.disabled = true; // can't rejoin
      document.getElementById("call-status").classList.remove("active");
      document.getElementById("remote-share-video").style.display = "none";
      document.getElementById("hero-image").style.display = "block";
      setStatus("Session ended.");
    }

  } catch (error) {
    console.error("[WxCC]: joinSession error:", error);
    setStatus("Could not connect to session.");
    joinBtn.disabled = false;
  }
}

init();

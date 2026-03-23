const ACCESS_TOKEN = "eyJhbGciOiJSUzI1NiJ9.eyJtYWNoaW5lX3R5cGUiOiJhcHB1c2VyIiwiY2x1c3RlciI6IlAwQTEiLCJwcml2YXRlIjoiZXlKamRIa2lPaUpLVjFRaUxDSmxibU1pT2lKQk1USTRRMEpETFVoVE1qVTJJaXdpWVd4bklqb2laR2x5SW4wLi5CN2pDcTdwSF9DZ1pkVW02NHpZSmlBLnpnSUdEYWNBdWk1TVhZSm1DVGFsVXR2OXg4eU12a0xIRHBvYWFFaVg4aWVxV2FRd3d3SFVsa29XMnlMcDdPSGRsX1ZWTnltenBIYWpVdndUblBRdUVsSGdYRlJucWZyY0lMZmY3dzcyVXFNNk9yanNkNGxpazAzVS11MlNMaTRJQWkxR052eU0tcVMzMVZjdWVnRDB5UlVqX3pMS09BOUhQNl9TWGx2OVJJcE1QVmtYNlFVTDBtdjRrMXlkODJUZ1NKOEpCSndiX0V6UjItd28wdkdIbmEzSkx2MTdiTWQ2S09UV1VSN0VYZmptRzBLUkp0OUh4NW1iRTFUQmc1NUJ2UnNmZkdPbXJxeUxoMkR6YW10SUxMcG94OTRIczRpRGlZVS1fLTRIdm9kZzRFY3oweHJ1NU91LUdBWEhVSUwwdzBOQlBQenRSRU52bnNCdk9JZEI4VWR4WVJVNV9leWJBTVBiTm1LdnZGcmt0eldIbXliaDc3aVJSeVJ0LUk1aVdrZXRKS190Q3h4ckdtOHRiZHYyVVRraGlObEFoeVdYbjJPczF0Z3JNWFgxVmhDWFpxMy12cXFfaXJoUC1MUmQydW13amI1eG5iYkpIaWVUT2pSdXBqNmk1ZFRLY05wQ0NCU1BlZmJJcmRrSG9PQ1RRTGx0VGtKRzhJX3ppRjZpYzFVQzBKeGxaTEVCMmttandkY3RNY0JqRUpsMDFrVk1QMWkzSUEtRTJKQjd3MS1mY0ExYzExNGphTG9KZ2g2Y3dONzNseTlobjR1V0plek5QZVZDNDNVZllaem9BRHAtZGlxaXRHNjFScEhQNjc2QW5RZ09xM3JncElPNkJ6V0JmMWU5RktpOFBEOXVnTUxLWEZsR3ZqdjF2RXJGZnB5R01lV21xamRhRzJjLmlJSHk0ZjkzWWdYSEk5c0RWY3dVR3ciLCJyZWZlcmVuY2VfaWQiOiIxZDhhNDc0MC1kMWYxLTQ1M2YtYjIwYy0wMDYzODIwNzdhNmIiLCJpc3MiOiJodHRwczovL2lkYnJva2VyLWItdXMud2ViZXguY29tL2lkYiIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJjbGllbnRfaWQiOiJDMzExNzcyM2EwYTRjOTg1YThiZDZkZGE3NmY3NzY2YzUxMzI0YjZmNDFiZjRmZWYxYzJjODI3ODRhMWYyOTc1YyIsInVzZXJfdHlwZSI6Im1hY2hpbmUiLCJ0b2tlbl9pZCI6IkFhWjNyME1qQXhaVEl6Tm1JdE5EZGlaaTAwWmpGakxXSmhPRGd0T1Raa1pHTTBZV001Tmpsak1qQTJPVFZtTnpNdE4yVXgiLCJvcmdfaWQiOiJjNjM3Y2M2MS1lNThlLTRkMTEtOTRjNy03YTE1ODcxNGE2NzIiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI2MDMyMzExNTAyOC4xOTFaIiwicmVhbG0iOiJjNjM3Y2M2MS1lNThlLTRkMTEtOTRjNy03YTE1ODcxNGE2NzIiLCJjaXNfdXVpZCI6ImRiMzNhZjk5LTdkMmMtNGVlYy1iODM5LWI5YzY5MmQxMmI5NyIsImV4cGlyeV90aW1lIjoxNzc0MzMxNDI3NDk1LCJleHAiOjE3NzQzMzE0Mjc0OTV9.WOneRtBrSL2-QEdH9f6iKckd14mZsjy1R1xDXdycdJU-v-KwDy3G8ukMRcP28ahrVXAkXQ8QwN-kXoSuHZ2ELvhglwLN_9LNZ_nG1z-xOnFNQt1ULZOjdv3uG2P5sBa7kb4eF0QVjZRj4bv13DRgIWqkikWVAoItu01k1TZ3Iw6Ng3eHHeUlpxCekQoSRJCuVVEIQIyiekLlhkDpUMJKjeGr_d9q-4PjqaxIT7-gwGTNzUVzAc52UsqvYuLHT_MR8lI4VFJE1SGxBajOpdsGQZ2DlgHnNBqKsitK4GqsnAMHjeEzSSfA2kukUzvB7l1JyXYPyQ2k5eHx7JmlFi2Vqg";
const TO_PERSON_EMAIL = "vvazquez@wxsd.us";

const chatHistory = document.getElementById("chat-history");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const status = document.getElementById("status");

function appendMessage(from, text) {
  const msg = document.createElement("div");
  msg.className = `chat-message chat-message--${from}`;
  msg.textContent = text;
  chatHistory.appendChild(msg);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

function setStatus(text) {
  status.textContent = text;
}

async function sendMessage() {
  const text = chatInput.value.trim();
  console.log("[WxCC]: sendMessage called, text:", text);
  if (!text) return;

  appendMessage("me", text);
  chatInput.value = "";
  chatInput.focus();

  try {
    const response = await fetch("https://webexapis.com/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ toPersonEmail: TO_PERSON_EMAIL, text }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[WxCC]: Send failed:", error.message);
      setStatus("Message failed to send.");
    } else {
      console.log("[WxCC]: Message sent successfully");
      setStatus("");
    }
  } catch (error) {
    console.error("[WxCC]: Send error:", error);
    setStatus("Message failed to send.");
  }
}

chatSend.addEventListener("click", sendMessage);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
});

chatHistory.scrollTop = chatHistory.scrollHeight;

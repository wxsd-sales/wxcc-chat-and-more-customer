# Security Cleaning Log

This document records the steps required to clean sensitive data before publishing this repository publicly.

---

## Step 1 — Remove commented-out secrets from current files (do first)

**File:** `index.js`
- Line 3: remove `// const WXCC_HOOK_URL = "https://hooks.us.webexconnect.io/events/12IOCZHHTT";`
- Line 9: remove `// const INAPP_APP_ID = "VI24093513";`

**File:** `index-audio.js`
- Lines 26–39: remove the old commented-out fetch block that contains `WXCC_HOOK_URL`, `INAPP_APP_ID`, and `INAPP_USER_ID`

Commit these changes before running the history rewrite.

---

## Step 2 — Purge sensitive data from git history (required before publishing)

The following values exist permanently in the git object store and must be rewritten out of history before the repo is made public:

| Value | Type | Introduced in commit |
|---|---|---|
| Full Webex Bearer JWT (see below) | Access token | `f71902e` |
| `https://hooks.us.webexconnect.io/events/12IOCZHHTT` | Webhook URL | `f71902e` |
| `https://hooks.us.webexconnect.io/events/HILBRZW77M` | Webhook URL | multiple commits |
| `vvazquez@wxsd.us` | Email address | `f71902e` |
| `vvazquez@cisco.com` | Email address | `498ee13` |
| `DA05221332` | InApp App ID | `498ee13` |
| `VI24093513` | InApp App ID (old) | `62b5a74` |
| `6806ea7s-a04e-4fdb-9d86-0b33626f3577` | InApp User ID | `62b5a74` |
| `https://258d-2a0c-5a84-e609-a00-84d4-e94e-1551-7d59.ngrok-free.app` | ngrok tunnel URL | `d6def48` |
| `https://wxsd.webex.com/wxsd/j.php?MTID=md2fcfba19d7b995d354add25cf452812` | Webex meeting link | `8f372cd` |

### How to do it

1. Install `git-filter-repo` (requires Python):
   ```bash
   pip install git-filter-repo
   ```

2. Create a file called `replacements.txt` in the repo root with this content:
   ```
   eyJhbGciOiJSUzI1NiJ9.eyJtYWNoaW5lX3R5cGUiOiJhcHB1c2VyIiwiY2x1c3RlciI6IlAwQTEiLCJwcml2YXRlIjoiZXlKamRIa2lPaUpLVjFRaUxDSmxibU1pT2lKQk1USTRRMEpETFVoVE1qVTJJaXdpWVd4bklqb2laR2x5SW4wLi5CN2pDcTdwSF9DZ1pkVW02NHpZSmlBLnpnSUdEYWNBdWk1TVhZSm1DVGFsVXR2OXg0eU12a0xIRHBvYWFFaVg0aWVxV2FRd3d3SFVsa29XMnlMcDdPSGRsX1ZWTnltenBIYWpVdndUblBRdUVsSGdYRlJucWZyY0lMZmY3dzcyVXFNNk9yanNkNGxpazAzVS11MlNMaTRJQWkxR052eU0tcVMzMVZjdWVnRDB5UlVqX3pMS09BOUhQNl9TWGx2OVJJcE1QVmtYNlFVTDBtdjRrMXlkODJUZ1NKOEpCSndiX0V6UjItd28wdkdIbmEzSkx2MTdiTWQ2S09UV1VSN0VYZmptRzBLUkp0OUh4NW1iRTFUQmc1NUJ2UnNmZkdPbXJxeUxoMkR6YW10SUxMcG94OTRIczRpRGlZVS1fLTRIdm9kZzRFY3oweHJ1NU91LUdBWEhVSUwwdzBOQlBQenRSRU52bnNCdk9JZEI0VWR4WVJVNV9leWJBTVBiTm1LdnZGcmt0eldIbXliaDc3aVJSeVJ0LUk1aVdrZXRKS190Q3h4ckdtOHRiZHYyVVRraGlObEFoeVdYbjJPczF0Z3JNWFgxVmhDWFpxMy12cXFfaXJoUC1MUmQydW13amI1eG5iYkpIaWVUT2pSdXBqNmk1ZFRLY05wQ0NCU1BlZmJJcmRrSG9PQ1RRTGx0VGtKRzhJX3ppRjZpYzFVQzBKeGxaTEVCMmttandkY3RNY0JqRUpsMDFrVk1QMWkzSUEtRTJKQjd3MS1mY0ExYzExNGphTG9KZ2g2Y3dONzNseTlobjR1V0plek5QZVZDNDNVZllaem9BRHAtZGlxaXRHNjFScEhQNjc2QW5RZ09xM3JncElPNkJ6V0JmMWU5RktpOFBEOXVnTUxLWEZsR3ZqdjF2RXJGZnB5R01lV21xamRhRzJjLmlJSHk0ZjkzWWdYSEk5c0RWY3dVR3ciLCJyZWZlcmVuY2VfaWQiOiIxZDhhNDc0MC1kMWYxLTQ1M2YtYjIwYy0wMDYzODIwNzdhNmIiLCJpc3MiOiJodHRwczovL2lkYnJva2VyLWItdXMud2ViZXguY29tL2lkYiIsInRva2VuX3R5cGUiOiJCZWFyZXIiLCJjbGllbnRfaWQiOiJDMzExNzcyM2EwYTRjOTg1YThiZDZkZGE3NmY3NzY2YzUxMzI0YjZmNDFiZjRmZWYxYzJjODI3ODRhMWYyOTc1YyIsInVzZXJfdHlwZSI6Im1hY2hpbmUiLCJ0b2tlbl9pZCI6IkFhWjNyME1qQXhaVEl6Tm1JdE5EZGlaaTAwWmpGakxXSmhPRGd0T1Raa1pHTTBZV001Tmpsak1qQTJPVFZtTnpNdE4yVXgiLCJvcmdfaWQiOiJjNjM3Y2M2MS1lNThlLTRkMTEtOTRjNy03YTE1ODcxNGE2NzIiLCJ1c2VyX21vZGlmeV90aW1lc3RhbXAiOiIyMDI2MDMyMzExNTAyOC4xOTFaIiwicmVhbG0iOiJjNjM3Y2M2MS1lNThlLTRkMTEtOTRjNy03YTE1ODcxNGE2NzIiLCJjaXNfdXVpZCI6ImRiMzNhZjk5LTdkMmMtNGVlYy1iODM5LWI5YzY5MmQxMmI5NyIsImV4cGlyeV90aW1lIjoxNzc0MzMxNDI3NDk1LCJleHAiOjE3NzQzMzE0Mjc0OTV9.WOneRtBrSL2-QEdH9f6iKckd14mZsjy1R1xDXdycdJU-v-KwDy3G8ukMRcP28ahrVXAkXQ8QwN-kXoSuHZ2ELvhglwLN_9LNZ_nG1z-xOnFNQt1ULZOjdv3uG2P5sBa7kb4eF0QVjZRj4bv13DRgIWqkikWVAoItu01k1TZ3Iw6Ng3eHHeUlpxCekQoSRJCuVVEIQIyiekLlhkDpUMJKjeGr_d9q-4PjqaxIT7-gwGTNzUVzAc52UsqvYuLHT_MR8lI4VFJE1SGxBajOpdsGQZ2DlgHnNBqKsitK4GqsnAMHjeEzSSfA2kukUzvB7l1JyXYPyQ2k5eHx7JmlFi2Vqg==>REDACTED_TOKEN
   https://hooks.us.webexconnect.io/events/12IOCZHHTT==>REDACTED_WEBHOOK_URL
   https://hooks.us.webexconnect.io/events/HILBRZW77M==>REDACTED_WEBHOOK_URL
   vvazquez@wxsd.us==>REDACTED_EMAIL
   vvazquez@cisco.com==>REDACTED_EMAIL
   DA05221332==>REDACTED_APP_ID
   VI24093513==>REDACTED_APP_ID
   6806ea7s-a04e-4fdb-9d86-0b33626f3577==>REDACTED_USER_ID
   https://258d-2a0c-5a84-e609-a00-84d4-e94e-1551-7d59.ngrok-free.app==>REDACTED_NGROK_URL
   md2fcfba19d7b995d354add25cf452812==>REDACTED_MEETING_ID
   ```

3. Run the rewrite:
   ```bash
   git filter-repo --replace-text replacements.txt --force
   ```

4. Force-push to GitHub (only safe because this is a new public repo with no existing forks):
   ```bash
   git push origin main --force
   ```

5. **Delete `replacements.txt` immediately after** — it contains the sensitive strings.

### What this does
- Rewrites every historical commit that contained those strings
- All commit messages and timestamps are preserved
- Only the commit hashes (SHAs) change
- The sensitive values become unrecoverable from the public repo

---

## Remaining items (lower priority, review before publishing)

- **`CUSTOMER_EMAIL`** (`vvazquez@wxsd.us`) still hardcoded in `index.js:12` and `index-audio.js:4` in the current working tree — replace with a placeholder or make configurable.
- **`INAPP_APP_ID` / `INAPP_USER_ID`** still hardcoded in current files — should be injected at deploy time rather than committed.
- **Production Railway URL** (`be-guest-and-meeting-creation-production.up.railway.app`) in `index.js`, `index-audio.js`, `index-screenshare.js` — consider moving to a config variable.

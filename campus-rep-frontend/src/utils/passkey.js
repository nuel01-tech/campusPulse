import {
  startAuthentication,
  startRegistration,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";
import api from "../api/axios";

/**
 * Checks if the browser environment supports WebAuthn / Passkeys.
 */
export function isPasskeySupported() {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

/**
 * Fetch the user's registered passkey status and list of devices.
 */
export async function fetchPasskeyStatus() {
  const res = await api.get("/accounts/passkeys/status/");
  return res.data;
}

/**
 * Perform passkey registration ceremony.
 * Returns the backend verification response.
 */
export async function registerPasskey(deviceName = "My device") {
  if (!isPasskeySupported()) {
    throw new Error(
      "Your browser or device does not support WebAuthn / Passkeys. Please use a modern browser."
    );
  }

  // 1. Get registration options from server
  const optionsRes = await api.post("/accounts/passkeys/register/options/");
  const rawOptions = optionsRes.data.options;
  const challengeId = optionsRes.data.challenge_id;

  const optionsJSON =
    typeof rawOptions === "string" ? JSON.parse(rawOptions) : rawOptions;

  // 2. Invoke platform authenticator (Touch ID, Face ID, Windows Hello, Security Key)
  let credential;
  try {
    credential = await startRegistration({ optionsJSON });
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error(
        "Passkey setup was cancelled or timed out. Please try again."
      );
    }
    throw new Error(err.message || "Passkey registration failed.");
  }

  // 3. Verify registration credential with backend
  const verifyRes = await api.post("/accounts/passkeys/register/verify/", {
    credential,
    device_name: deviceName,
    challenge_id: challengeId,
  });

  return verifyRes.data;
}

/**
 * Perform passkey authentication ceremony for an attendance session.
 * Returns the attendance grant token on success.
 */
export async function authenticatePasskeyForSession(sessionId) {
  if (!isPasskeySupported()) {
    throw new Error(
      "Your browser or device does not support WebAuthn / Passkeys."
    );
  }

  // 1. Request authentication challenge from backend
  const optionsRes = await api.post("/accounts/passkeys/auth/options/", {
    session_id: sessionId,
  });

  const rawOptions = optionsRes.data.options;
  const challengeId = optionsRes.data.challenge_id;

  const optionsJSON =
    typeof rawOptions === "string" ? JSON.parse(rawOptions) : rawOptions;

  // 2. Prompt user for biometric / PIN authentication
  let credential;
  try {
    credential = await startAuthentication({ optionsJSON });
  } catch (err) {
    if (err.name === "NotAllowedError") {
      throw new Error(
        "Passkey verification was cancelled. Please try again to check in."
      );
    }
    throw new Error(err.message || "Passkey verification failed.");
  }

  // 3. Verify signed assertion with backend
  const verifyRes = await api.post("/accounts/passkeys/auth/verify/", {
    credential,
    challenge_id: challengeId,
  });

  if (!verifyRes.data?.attendance_grant) {
    throw new Error("Did not receive attendance authorization token.");
  }

  return verifyRes.data.attendance_grant;
}

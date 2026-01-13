// ============================================
// DEVICE UTILITIES - Device identification and management
// ============================================

import { registerDevice, updateDeviceLastSeen } from "./appwrite-db";

/**
 * Generate a unique device ID based on browser fingerprinting
 */
export function generateDeviceId(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx?.fillText("fingerprint", 10, 10);

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    screen.width + "x" + screen.height,
    new Date().getTimezoneOffset(),
    !!window.sessionStorage,
    !!window.localStorage,
    !!window.indexedDB,
    canvas.toDataURL(),
  ].join("|");

  // Simple hash function
  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return Math.abs(hash).toString(36);
}

/**
 * Generate a human-readable device name
 */
export function generateDeviceName(): string {
  const userAgent = navigator.userAgent;
  const platform = navigator.platform;

  // Detect device type
  if (/Android/i.test(userAgent)) {
    return "Android Device";
  } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
    return /iPad/i.test(userAgent) ? "iPad" : "iPhone";
  } else if (/Windows/i.test(platform)) {
    return "Windows PC";
  } else if (/Mac/i.test(platform)) {
    return "Mac";
  } else if (/Linux/i.test(platform)) {
    return "Linux Device";
  } else {
    return "Unknown Device";
  }
}

/**
 * Register this device with the backend
 */
export async function registerCurrentDevice(userId: string) {
  const deviceId = generateDeviceId();
  const deviceName = generateDeviceName();

  try {
    const device = await registerDevice(
      userId,
      deviceId,
      deviceName,
      navigator.userAgent
    );

    // Store device info in localStorage for quick access
    localStorage.setItem("deviceId", deviceId);
    localStorage.setItem("deviceName", deviceName);

    console.log(`Device registered: ${deviceName} (${deviceId})`);
    return device;
  } catch (error) {
    console.error("Failed to register device:", error);
    throw error;
  }
}

/**
 * Get stored device ID or generate new one
 */
export function getDeviceId(): string {
  let deviceId = localStorage.getItem("deviceId");
  if (!deviceId) {
    deviceId = generateDeviceId();
    localStorage.setItem("deviceId", deviceId);
  }
  return deviceId;
}

/**
 * Get stored device name or generate new one
 */
export function getDeviceName(): string {
  let deviceName = localStorage.getItem("deviceName");
  if (!deviceName) {
    deviceName = generateDeviceName();
    localStorage.setItem("deviceName", deviceName);
  }
  return deviceName;
}

/**
 * Update device last seen timestamp
 */
export async function updateDeviceActivity(userId: string) {
  const deviceId = getDeviceId();
  try {
    await updateDeviceLastSeen(deviceId);
  } catch (error) {
    console.error("Failed to update device activity:", error);
  }
}

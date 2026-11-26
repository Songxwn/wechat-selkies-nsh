// Platform capability checks and external-browser opening.
// Mirrors lib/services/platform_service.dart.

import { openUrl, platform, signal, WebView } from "nsh";

export const DEPLOY_URL = "https://songxwn.com/cloud-wechat/";
export const PROJECT_URL = "https://github.com/nickrunning/wechat-selkies";
export const APP_VERSION = "5.0.1";

// The original app had no endorsed in-app web view on Linux and fell back to the
// system browser there; every other platform supports one. `WebView.available()`
// refines this once the runtime answers (it also accounts for capabilities).
const inAppWebView = signal(platform.os !== "linux");
WebView.available()
  .then((available) => inAppWebView.set(available))
  .catch(() => {});

export function supportsInAppWebView(): boolean {
  return inAppWebView();
}

/** Normalizes user input into a full URL, defaulting to https://. */
export function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (trimmed === "") return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

/** Opens a URL in the system's default browser; resolves whether it opened. */
export async function openExternal(url: string): Promise<boolean> {
  if (url === "") return false;
  try {
    const { opened } = await openUrl(url);
    return opened;
  } catch {
    return false;
  }
}

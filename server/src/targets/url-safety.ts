import { isSafeIpAddress } from "@sitepulse/backend/network/ip-safety.js";

export function isSafeTargetUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost") {
    return false;
  }

  if (hostname.includes(":")) {
    return isSafeIpAddress(hostname);
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return isSafeIpAddress(hostname);
  }

  return true;
}

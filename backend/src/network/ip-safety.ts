import { isIP } from "node:net";

function normalizeIpAddress(address: string): string {
  return address.replace(/^\[|\]$/g, "");
}

export function isIpAddress(address: string): boolean {
  return isIP(normalizeIpAddress(address)) !== 0;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  const [first, second] = octets;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLoopbackIpv4(address: string): boolean {
  return address.split(".").map(Number)[0] === 127;
}

function isLinkLocalIpv4(address: string): boolean {
  const [first, second] = address.split(".").map(Number);

  return first === 169 && second === 254;
}

function isUnspecifiedIpv4(address: string): boolean {
  return address.split(".").every((octet) => Number(octet) === 0);
}

function isUnsafeIpv4(address: string): boolean {
  return (
    isPrivateIpv4(address) ||
    isLoopbackIpv4(address) ||
    isLinkLocalIpv4(address) ||
    isUnspecifiedIpv4(address)
  );
}

function getMappedIpv4(address: string): string | null {
  const normalized = normalizeIpAddress(address).toLowerCase();

  if (!normalized.startsWith("::ffff:")) {
    return null;
  }

  const mappedAddress = normalized.slice("::ffff:".length);

  return isIP(mappedAddress) === 4 ? mappedAddress : null;
}

function isUnsafeIpv6(address: string): boolean {
  const normalized = normalizeIpAddress(address).toLowerCase();

  if (normalized === "::" || normalized === "::1") {
    return true;
  }

  if (
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  ) {
    return true;
  }

  const mappedIpv4 = getMappedIpv4(normalized);

  return mappedIpv4 !== null && isUnsafeIpv4(mappedIpv4);
}

export function isSafeIpAddress(address: string): boolean {
  const normalized = normalizeIpAddress(address);
  const addressType = isIP(normalized);

  if (addressType === 4) {
    return !isUnsafeIpv4(normalized);
  }

  if (addressType === 6) {
    return !isUnsafeIpv6(normalized);
  }

  return false;
}
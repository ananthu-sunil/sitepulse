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

function isCarrierGradeNatIpv4(address: string): boolean {
  const [first, second] = address.split(".").map(Number);

  return first === 100 && second >= 64 && second <= 127;
}

function isIetfProtocolAssignmentIpv4(address: string): boolean {
  const [first, second, third] = address.split(".").map(Number);

  return first === 192 && second === 0 && third === 0;
}

function isBenchmarkingIpv4(address: string): boolean {
  const [first, second] = address.split(".").map(Number);

  return first === 198 && second >= 18 && second <= 19;
}

function isDocumentationIpv4(address: string): boolean {
  const [first, second, third] = address.split(".").map(Number);

  return (
    (first === 192 && second === 0 && third === 2) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113)
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

function isMulticastIpv4(address: string): boolean {
  const first = address.split(".").map(Number)[0];

  return first >= 224 && first <= 239;
}

function isUnsafeIpv4(address: string): boolean {
  return (
    isPrivateIpv4(address) ||
    isLoopbackIpv4(address) ||
    isLinkLocalIpv4(address) ||
    isUnspecifiedIpv4(address) ||
    isCarrierGradeNatIpv4(address) ||
    isIetfProtocolAssignmentIpv4(address) ||
    isBenchmarkingIpv4(address) ||
    isDocumentationIpv4(address) ||
    isMulticastIpv4(address)
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
    normalized.startsWith("feb") ||
    normalized.startsWith("ff")
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

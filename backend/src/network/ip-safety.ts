
function isIpv4Address(address: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(address);
}

export function isIpAddress(address: string): boolean {
  return isIpv4Address(address) || address.includes(":");
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  if (octets.some((octet) => octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isLoopbackIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  return octets[0] === 127;
}

function isLinkLocalIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  return octets[0] === 169 && octets[1] === 254;
}

function isUnspecifiedIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);

  return octets.every((octet) => octet === 0);
}

function isUnsafeIpv6(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "");

  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe8") ||
    normalized.startsWith("fe9") ||
    normalized.startsWith("fea") ||
    normalized.startsWith("feb")
  );
}

export function isSafeIpAddress(address: string): boolean {
  if (isIpv4Address(address)) {
    return !(
      isPrivateIpv4(address) ||
      isLoopbackIpv4(address) ||
      isLinkLocalIpv4(address) ||
      isUnspecifiedIpv4(address)
    );
  }

  if (address.includes(":")) {
    return !isUnsafeIpv6(address);
  }

  return true;
}

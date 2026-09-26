function isIpv4Address(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);

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

function isLoopbackIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);

  return octets[0] === 127;
}

function isLinkLocalIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);

  return octets[0] === 169 && octets[1] === 254;
}

function isUnspecifiedIpv4(hostname: string): boolean {
  const octets = hostname.split(".").map(Number);

  return octets.every((octet) => octet === 0);
}

function isUnsafeIpv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");

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

export function isSafeTargetUrl(url: URL): boolean {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  const hostname = url.hostname.toLowerCase();

  if (hostname === "localhost") {
    return false;
  }

  if (isIpv4Address(hostname)) {
    if (
      isPrivateIpv4(hostname) ||
      isLoopbackIpv4(hostname) ||
      isLinkLocalIpv4(hostname) ||
      isUnspecifiedIpv4(hostname)
    ) {
      return false;
    }
  }

  if (hostname.includes(":") && isUnsafeIpv6(hostname)) {
    return false;
  }

  return true;
}
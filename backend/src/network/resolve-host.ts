import { lookup } from "node:dns/promises";

export async function resolveHostname(hostname: string): Promise<string[]> {
  const addresses = await lookup(hostname, { all: true });

  return addresses.map(({ address }) => address);
}
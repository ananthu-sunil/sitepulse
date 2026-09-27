export type SafeFetchOptions = {
  signal?: AbortSignal;
  maxRedirects?: number;
};

export type SafeFetchResponse = {
  statusCode: number;
  location: string | null;
};

export async function safeFetch(
  url: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResponse> {
  throw new Error("Not implemented");
}
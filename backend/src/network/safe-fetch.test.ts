import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createValidatedConnector,
  safeFetch,
  SafeFetchError,
} from "./safe-fetch.js";
import { resolveHostname } from "./resolve-host.js";
import { isSafeIpAddress } from "./ip-safety.js";
import { readFile } from "node:fs/promises";
import { TLSSocket } from "node:tls";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { Client } from "undici";

let server:
  | ReturnType<typeof createHttpServer>
  | ReturnType<typeof createHttpsServer>
  | undefined;

vi.mock("./resolve-host.js", () => ({
  resolveHostname: vi.fn(),
}));

vi.mock("./ip-safety.js", async () => {
  const actual =
    await vi.importActual<typeof import("./ip-safety.js")>("./ip-safety.js");

  return {
    ...actual,
    isSafeIpAddress: vi.fn(actual.isSafeIpAddress),
  };
});

const mockedIsSafeIpAddress = vi.mocked(isSafeIpAddress);
const mockedResolveHostname = vi.mocked(resolveHostname);

describe("safeFetch", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    mockedResolveHostname.mockReset();
    mockedIsSafeIpAddress.mockReset();

    if (!server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    server = undefined;
  });

  it("rejects an invalid URL", async () => {
    await expect(safeFetch("not-a-url")).rejects.toMatchObject({
      code: "unsafe_target",
    });
  });

  it("rejects unsupported protocols", async () => {
    await expect(safeFetch("ftp://example.com/file")).rejects.toMatchObject({
      code: "unsafe_target",
    });
  });

  it("rejects a literal unsafe IP address", async () => {
    await expect(safeFetch("http://127.0.0.1")).rejects.toMatchObject({
      code: "unsafe_target",
    });
  });

  it("rejects a hostname that resolves to an unsafe IP", async () => {
    mockedResolveHostname.mockResolvedValue(["10.0.0.1"]);

    await expect(safeFetch("https://example.com")).rejects.toMatchObject({
      code: "unsafe_target",
    });

    expect(mockedResolveHostname).toHaveBeenCalledWith("example.com");
  });

  it("rejects a hostname if any resolved address is unsafe", async () => {
    mockedResolveHostname.mockResolvedValue(["93.184.216.34", "192.168.1.10"]);

    await expect(safeFetch("https://example.com")).rejects.toMatchObject({
      code: "unsafe_target",
    });
  });

  it("rejects a hostname that resolves to no addresses", async () => {
    mockedResolveHostname.mockResolvedValue([]);

    await expect(safeFetch("https://example.com")).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("returns network_error when DNS resolution fails", async () => {
    mockedResolveHostname.mockRejectedValue(new Error("DNS resolution failed"));

    await expect(safeFetch("https://example.com")).rejects.toMatchObject({
      code: "network_error",
    });
  });

  it("preserves SafeFetchError thrown during validation", async () => {
    mockedResolveHostname.mockResolvedValue(["127.0.0.1"]);

    try {
      await safeFetch("https://example.com");
      throw new Error("Expected safeFetch to reject");
    } catch (error) {
      expect(error).toBeInstanceOf(SafeFetchError);
      expect(error).toMatchObject({
        code: "unsafe_target",
      });
    }
  });

  it("connects to the validated IP while preserving the original hostname", async () => {
    let remoteAddress: string | undefined;
    let hostHeader: string | undefined;

    server = createHttpServer((request, response) => {
      remoteAddress = request.socket.remoteAddress;
      hostHeader = request.headers.host;

      response.writeHead(200);
      response.end("ok");
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    const port = address.port;
    const hostname = "sitepulse.test";
    const validatedAddress = "127.0.0.1";

    const client = new Client(`http://${hostname}:${port}`, {
      connect: createValidatedConnector(validatedAddress),
    });

    try {
      const response = await client.request({
        path: "/",
        method: "GET",
      });

      await response.body.dump();

      expect(response.statusCode).toBe(200);
      expect(remoteAddress).toBe("127.0.0.1");
      expect(hostHeader).toBe(`${hostname}:${port}`);
    } finally {
      await client.close();
    }
  });

  it("connects to the validated IP while preserving HTTPS hostname identity", async () => {
    const key = await readFile(
      new URL("./fixtures/test-key.pem", import.meta.url),
    );

    const cert = await readFile(
      new URL("./fixtures/test-cert.pem", import.meta.url),
    );

    let remoteAddress: string | undefined;
    let hostHeader: string | undefined;
    let serverName: string | undefined;

    server = createHttpsServer(
      {
        key,
        cert,
      },
      (request, response) => {
        remoteAddress = request.socket.remoteAddress;
        hostHeader = request.headers.host;
        serverName = (request.socket as TLSSocket).servername || undefined;

        response.writeHead(200);
        response.end("ok");
      },
    );

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    const port = address.port;
    const hostname = "sitepulse.test";
    const validatedAddress = "127.0.0.1";

    const client = new Client(`https://${hostname}:${port}`, {
      connect: createValidatedConnector(validatedAddress, {
        ca: cert,
      }),
    });

    try {
      const response = await client.request({
        path: "/",
        method: "GET",
      });

      response.body.resume();

      expect(response.statusCode).toBe(200);
      expect(remoteAddress).toBe("127.0.0.1");
      expect(hostHeader).toBe(`${hostname}:${port}`);
      expect(serverName).toBe(hostname);
    } finally {
      await client.close();
    }
  });

  it("follows a safe redirect", async () => {
    mockedIsSafeIpAddress.mockImplementation(
      (address) => address === "127.0.0.1",
    );

    server = createHttpServer((request, response) => {
      if (request.url === "/start") {
        response.writeHead(302, {
          Location: "/final",
        });
        response.end();
        return;
      }

      response.writeHead(200);
      response.end("ok");
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    mockedResolveHostname.mockResolvedValue(["127.0.0.1"]);

    const response = await safeFetch(
      `http://sitepulse.test:${address.port}/start`,
    );

    expect(response.statusCode).toBe(200);
    expect(mockedResolveHostname).toHaveBeenCalledWith("sitepulse.test");
  });

  it("revalidates the destination of a redirect", async () => {
    mockedIsSafeIpAddress.mockImplementation(
      (address) => address === "127.0.0.1",
    );

    server = createHttpServer((_request, response) => {
      response.writeHead(302, {
        Location: "http://internal.example/secret",
      });
      response.end();
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    mockedResolveHostname
      .mockResolvedValueOnce(["127.0.0.1"])
      .mockResolvedValueOnce(["10.0.0.1"]);

    await expect(
      safeFetch(`http://sitepulse.test:${address.port}/start`),
    ).rejects.toMatchObject({
      code: "unsafe_target",
    });

    expect(mockedResolveHostname).toHaveBeenNthCalledWith(1, "sitepulse.test");

    expect(mockedResolveHostname).toHaveBeenNthCalledWith(
      2,
      "internal.example",
    );
  });

  it("rejects a redirect to an unsafe IP address", async () => {
    mockedIsSafeIpAddress.mockImplementation(
      (address) => address === "127.0.0.1",
    );

    server = createHttpServer((_request, response) => {
      response.writeHead(302, {
        Location: "http://10.0.0.1/secret",
      });
      response.end();
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    mockedResolveHostname.mockResolvedValue(["127.0.0.1"]);

    await expect(
      safeFetch(`http://sitepulse.test:${address.port}/start`),
    ).rejects.toMatchObject({
      code: "unsafe_target",
    });
  });

  it("rejects when the redirect limit is exceeded", async () => {
    mockedIsSafeIpAddress.mockImplementation(
      (address) => address === "127.0.0.1",
    );

    server = createHttpServer((request, response) => {
      const current = Number(
        new URL(request.url ?? "/", "http://sitepulse.test").searchParams.get(
          "redirect",
        ) ?? "0",
      );

      response.writeHead(302, {
        Location: `/?redirect=${current + 1}`,
      });
      response.end();
    });

    await new Promise<void>((resolve) => {
      server?.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();

    if (!address || typeof address === "string") {
      throw new Error("Failed to determine test server address");
    }

    mockedResolveHostname.mockResolvedValue(["127.0.0.1"]);

    await expect(
      safeFetch(`http://sitepulse.test:${address.port}/?redirect=0`),
    ).rejects.toMatchObject({
      code: "network_error",
    });

    expect(mockedResolveHostname).toHaveBeenCalledTimes(6);
  });
});

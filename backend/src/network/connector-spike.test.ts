import { readFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { afterEach, describe, expect, it } from "vitest";
import { Client, buildConnector } from "undici";

describe("validated IP connector spike", () => {
  let server:
    | ReturnType<typeof createHttpServer>
    | ReturnType<typeof createHttpsServer>
    | undefined;

  afterEach(async () => {
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
    const hostname = "sitepulse-spike.test";
    const validatedAddress = "127.0.0.1";

    const connector = buildConnector({});

    const client = new Client(`http://${hostname}:${port}`, {
      connect(options, callback) {
        connector(
          {
            ...options,
            hostname: validatedAddress,
          },
          callback,
        );
      },
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
    } finally {
      await client.close();
    }
  });

  it("connects to the validated IP while preserving HTTPS hostname identity", async () => {
    const key = await readFile(
      new URL("./fixtures/spike-key.pem", import.meta.url),
    );

    const cert = await readFile(
      new URL("./fixtures/spike-cert.pem", import.meta.url),
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
        serverName = request.socket.servername;

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
    const hostname = "sitepulse-spike.test";
    const validatedAddress = "127.0.0.1";

    const connector = buildConnector({
      ca: cert,
    });

    const client = new Client(`https://${hostname}:${port}`, {
      connect(options, callback) {
        connector(
          {
            ...options,
            hostname: validatedAddress,
          },
          callback,
        );
      },
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
  it("rejects an HTTPS certificate when the hostname does not match", async () => {
  const key = await readFile(
    new URL("./fixtures/spike-key.pem", import.meta.url),
  );

  const cert = await readFile(
    new URL("./fixtures/spike-cert.pem", import.meta.url),
  );

  server = createHttpsServer(
    {
      key,
      cert,
    },
    (_request, response) => {
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
  const hostname = "wrong-hostname.test";
  const validatedAddress = "127.0.0.1";

  const connector = buildConnector({
    ca: cert,
  });

  const client = new Client(`https://${hostname}:${port}`, {
    connectTimeout: 1000,
    connect(options, callback) {
      connector(
        {
          ...options,
          hostname: validatedAddress,
        },
        callback,
      );
    },
  });

  try {
    let requestError: unknown;

    try {
      await client.request({
        path: "/",
        method: "GET",
      });
    } catch (error) {
      requestError = error;
    }

    expect(requestError).toBeDefined();
    expect(requestError).toMatchObject({
      code: "ERR_TLS_CERT_ALTNAME_INVALID",
      host: hostname,
    });
  } finally {
    await client.destroy();
  }
});
});
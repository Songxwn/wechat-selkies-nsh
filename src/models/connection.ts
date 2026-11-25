// The connection model: one wechat-selkies endpoint the user has saved.
// Mirrors lib/models/connection.dart of the original Flutter app, including the
// JSON shape it persisted under the `connections` storage key.

export const kDefaultUrl = "https://localhost:3001";

export interface Connection {
  id: string;
  name: string;
  url: string;
  /** Ignore SSL certificate errors (self-signed certificates). */
  ignoreSsl: boolean;
  /** Open in the system browser instead of the in-app web view. */
  openExternal: boolean;
  /** Optional HTTP Basic authentication user name. */
  username: string;
  /** Optional HTTP Basic authentication password. */
  password: string;
}

/** A v4-shaped id, using the host `crypto` when it is available. */
export function newId(): string {
  const hostCrypto = (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto;
  if (hostCrypto && typeof hostCrypto.randomUUID === "function") {
    return hostCrypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

/** A new connection with a fresh id. */
export function createConnection(partial: Partial<Omit<Connection, "id">> = {}): Connection {
  return {
    id: newId(),
    name: partial.name ?? "未命名",
    url: partial.url ?? kDefaultUrl,
    ignoreSsl: partial.ignoreSsl ?? true,
    openExternal: partial.openExternal ?? false,
    username: partial.username ?? "",
    password: partial.password ?? "",
  };
}

/** The connection created automatically on first launch. */
export function defaultConnection(): Connection {
  return createConnection({ name: "本地微信", url: kDefaultUrl, ignoreSsl: true });
}

export function hasBasicAuth(connection: Connection): boolean {
  return connection.username.trim() !== "" || connection.password !== "";
}

export function connectionToJson(connection: Connection): Record<string, unknown> {
  return {
    id: connection.id,
    name: connection.name,
    url: connection.url,
    ignoreSsl: connection.ignoreSsl,
    openExternal: connection.openExternal,
    username: connection.username,
    password: connection.password,
  };
}

/** Reads a stored connection, tolerating the same missing/typed fields as the original. */
export function connectionFromJson(json: Record<string, unknown>): Connection {
  return {
    id: typeof json.id === "string" ? json.id : newId(),
    name: typeof json.name === "string" ? json.name : "未命名",
    url: typeof json.url === "string" ? json.url : kDefaultUrl,
    ignoreSsl: json.ignoreSsl !== false,
    openExternal: json.openExternal === true,
    username: typeof json.username === "string" ? json.username : "",
    password: json.password === null || json.password === undefined ? "" : String(json.password),
  };
}

// Persistence for the connection list, on top of nsh's `Storage`.
// Mirrors lib/services/storage_service.dart: a JSON array under `connections`
// and the selected id under `defaultConnectionId`; corrupt data reads as [].

import { Storage } from "nsh";
import { connectionFromJson, connectionToJson, type Connection } from "../models/connection";

const KEY_CONNECTIONS = "connections";
const KEY_DEFAULT_ID = "defaultConnectionId";

/** Parses a stored connection list; anything unreadable becomes an empty list. */
export function parseConnections(raw: string | null): Connection[] {
  if (raw === null || raw === "") return [];
  try {
    const decoded: unknown = JSON.parse(raw);
    if (!Array.isArray(decoded)) return [];
    return decoded
      .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === "object")
      .map(connectionFromJson);
  } catch {
    return [];
  }
}

export async function loadConnections(): Promise<Connection[]> {
  return parseConnections(await Storage.getItem(KEY_CONNECTIONS));
}

export async function saveConnections(connections: Connection[]): Promise<void> {
  await Storage.setItem(KEY_CONNECTIONS, JSON.stringify(connections.map(connectionToJson)));
}

export function loadDefaultId(): Promise<string | null> {
  return Storage.getItem(KEY_DEFAULT_ID);
}

export async function saveDefaultId(id: string | null): Promise<void> {
  if (id === null) {
    await Storage.removeItem(KEY_DEFAULT_ID);
  } else {
    await Storage.setItem(KEY_DEFAULT_ID, id);
  }
}

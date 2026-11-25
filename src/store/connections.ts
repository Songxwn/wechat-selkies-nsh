// The connection list's state: load, add/edit, delete, set default, persist.
// Mirrors lib/providers/connection_store.dart.

import { batch, signal } from "nsh";
import { defaultConnection, type Connection } from "../models/connection";
import * as storage from "../services/storage";

const connections = signal<Connection[]>([]);
const defaultId = signal<string | null>(null);

/** Every saved connection, in order (tracked where it is read). */
export const allConnections = () => connections();

export const currentDefaultId = () => defaultId();

export const isEmpty = () => connections().length === 0;

export function isDefaultConnection(connection: Connection): boolean {
  return connection.id === defaultId();
}

/** The default connection, falling back to the first one. */
export function defaultConnectionItem(): Connection | null {
  const list = connections();
  if (list.length === 0) return null;
  return list.find((connection) => connection.id === defaultId()) ?? list[0];
}

/** Loads the list, creating a default connection on first launch (as the original did). */
export async function initConnections(): Promise<void> {
  let list = await storage.loadConnections();
  let id = await storage.loadDefaultId();
  if (list.length === 0) {
    const first = defaultConnection();
    list = [first];
    id = first.id;
    await storage.saveConnections(list);
    await storage.saveDefaultId(id);
  } else if (id === null) {
    id = list[0].id;
  }
  batch(() => {
    connections.set(list);
    defaultId.set(id);
  });
}

/** Adds a connection or replaces the one with the same id. */
export async function saveConnection(connection: Connection): Promise<void> {
  const list = connections();
  const exists = list.some((c) => c.id === connection.id);
  const next = exists
    ? list.map((c) => (c.id === connection.id ? connection : c))
    : [...list, connection];
  connections.set(next);
  await storage.saveConnections(next);
  if (defaultId() === null && next.length > 0) {
    defaultId.set(next[0].id);
    await storage.saveDefaultId(next[0].id);
  }
}

/** Removes a connection; the default moves to the first remaining one. */
export async function removeConnection(id: string): Promise<void> {
  const next = connections().filter((connection) => connection.id !== id);
  connections.set(next);
  if (defaultId() === id) {
    const nextDefault = next.length > 0 ? next[0].id : null;
    defaultId.set(nextDefault);
    await storage.saveDefaultId(nextDefault);
  }
  await storage.saveConnections(next);
}

export async function setDefaultConnection(id: string): Promise<void> {
  defaultId.set(id);
  await storage.saveDefaultId(id);
}

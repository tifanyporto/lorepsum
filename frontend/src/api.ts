export const API_URL = "http://127.0.0.1:8000";

export async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.json();
}

// Every write goes through here; the verb is the only thing that changes
// between them. `body` is absent for a delete, which has nothing to say
// beyond the verb and the address.
async function send<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    // without this the server reads the body as plain text and refuses it
    // with a 422 before it ever looks inside
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    // the network carries text, never objects: JSON.stringify does the turning
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  // 204 means "done, and there is nothing to send back". Asking an empty body
  // for its JSON throws, so nothing is what comes back - and a delete has
  // nothing to read anyway.
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json();
}

// Create. The server answers with what it made, including the id it chose.
export function postJson<T>(path: string, body: unknown): Promise<T> {
  return send<T>("POST", path, body);
}

// Change. Only the fields in `body` are touched; everything else is left as
// it was - which is what lets a single field be edited on its own.
export function patchJson<T>(path: string, body: unknown): Promise<T> {
  return send<T>("PATCH", path, body);
}

// Remove. `delete` is a reserved word in JavaScript, so the name is short.
export function del(path: string): Promise<void> {
  return send<void>("DELETE", path);
}

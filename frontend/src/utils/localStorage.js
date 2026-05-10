export function readJsonStorage(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function writeJsonStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

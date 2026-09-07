// Escapes user-supplied text for safe use inside a RegExp constructor.
export function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

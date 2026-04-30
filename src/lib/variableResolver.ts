/**
 * Replaces {{variable_name}} occurrences with values from the vars map.
 * Unknown variables are left as-is so the user can see what's missing.
 */
export function resolveVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key: string) => {
    const trimmed = key.trim();
    return Object.prototype.hasOwnProperty.call(vars, trimmed) ? vars[trimmed] : match;
  });
}

/**
 * Returns all {{variable_name}} tokens found in a string.
 */
export function extractVariableTokens(text: string): string[] {
  const tokens: string[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const key = m[1].trim();
    if (!tokens.includes(key)) tokens.push(key);
  }
  return tokens;
}

/**
 * Highlight {{var}} tokens — returns segments with isVar flag for rendering.
 */
export function tokenize(text: string): { text: string; isVar: boolean }[] {
  const segments: { text: string; isVar: boolean }[] = [];
  const re = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ text: text.slice(last, m.index), isVar: false });
    segments.push({ text: m[0], isVar: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last), isVar: false });
  return segments;
}

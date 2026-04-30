import type { ValidationResult, ValidationCheck, SerializedResponse } from '../types/execution';

function deepEqual(a: unknown, b: unknown, path: string): ValidationCheck[] {
  const checks: ValidationCheck[] = [];

  if (typeof b !== typeof a) {
    checks.push({
      type: 'json-deep-equal',
      path,
      expected: JSON.stringify(b),
      actual: JSON.stringify(a),
      passed: false,
    });
    return checks;
  }

  if (b === null || typeof b !== 'object') {
    const passed = a === b;
    checks.push({
      type: 'json-deep-equal',
      path: path || '(root)',
      expected: JSON.stringify(b),
      actual: JSON.stringify(a),
      passed,
    });
    return checks;
  }

  if (Array.isArray(b)) {
    if (!Array.isArray(a)) {
      checks.push({ type: 'json-deep-equal', path, expected: 'array', actual: typeof a, passed: false });
      return checks;
    }
    for (let i = 0; i < b.length; i++) {
      checks.push(...deepEqual((a as unknown[])[i], b[i], `${path}[${i}]`));
    }
    return checks;
  }

  for (const key of Object.keys(b as object)) {
    checks.push(...deepEqual((a as Record<string, unknown>)?.[key], (b as Record<string, unknown>)[key], path ? `${path}.${key}` : key));
  }

  return checks;
}

export function validateResponse(
  response: SerializedResponse | undefined,
  expectedJson: string,
  expectedMode: 'json' | 'regex'
): ValidationResult {
  if (!expectedJson.trim()) {
    return { passed: true, checks: [] };
  }

  if (!response) {
    return {
      passed: false,
      checks: [{ type: 'json-deep-equal', expected: expectedJson, actual: '(sem resposta)', passed: false }],
    };
  }

  if (expectedMode === 'regex') {
    const lines = expectedJson.split('\n').map((l) => l.trim()).filter(Boolean);
    const checks: ValidationCheck[] = lines.map((pattern) => {
      let passed = false;
      let errorMsg = '';
      try {
        const re = new RegExp(pattern);
        passed = re.test(response.body);
      } catch (e) {
        errorMsg = `Regex inválida: ${(e as Error).message}`;
        passed = false;
      }
      return {
        type: 'regex' as const,
        expected: pattern,
        actual: errorMsg || response.body.slice(0, 100),
        passed,
      };
    });
    return { passed: checks.every((c) => c.passed), checks };
  }

  // JSON mode
  let expected: unknown;
  try {
    expected = JSON.parse(expectedJson);
  } catch {
    return {
      passed: false,
      checks: [{ type: 'json-deep-equal', expected: expectedJson, actual: '(JSON inválido na configuração)', passed: false }],
    };
  }

  const actual = response.bodyParsed;
  const checks = deepEqual(actual, expected, '');
  return { passed: checks.every((c) => c.passed), checks };
}

import { useState, useRef, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEnvironmentStore } from '../../store/environmentStore';

interface VarInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
}

export function VarInput({
  value,
  onChange,
  onKeyDown: outerKeyDown,
  onBlur: outerBlur,
  onSelect: outerSelect,
  disabled,
  className,
  ...props
}: VarInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [matchStart, setMatchStart] = useState(-1);
  const [filterLen, setFilterLen] = useState(0);

  const { environments, activeEnvironmentId } = useEnvironmentStore(
    useShallow((s) => ({ environments: s.environments, activeEnvironmentId: s.activeEnvironmentId }))
  );

  const varKeys = useMemo(() => {
    const env = environments.find((e) => e.id === activeEnvironmentId);
    return env ? env.variables.filter((v) => v.enabled && v.key).map((v) => v.key) : [];
  }, [environments, activeEnvironmentId]);

  function recheck(val: string, cursorPos: number) {
    const before = val.slice(0, cursorPos);
    const match = before.match(/\{\{([^}]*)$/);
    if (!match || varKeys.length === 0) {
      setSuggestions([]);
      return;
    }
    const f = match[1];
    const filtered = varKeys.filter((k) => k.toLowerCase().includes(f.toLowerCase()));
    setMatchStart(cursorPos - match[0].length);
    setFilterLen(f.length);
    setSuggestions(filtered);
    setActiveIdx(0);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    onChange(val);
    recheck(val, e.target.selectionStart ?? val.length);
  }

  function handleSelect(e: React.SyntheticEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    recheck(input.value, input.selectionStart ?? input.value.length);
    outerSelect?.(e as React.ChangeEvent<HTMLInputElement>);
  }

  function pick(varName: string) {
    const before = value.slice(0, matchStart);
    const afterRaw = value.slice(matchStart + 2 + filterLen);
    const after = afterRaw.startsWith('}}') ? afterRaw.slice(2) : afterRaw;
    const next = `${before}{{${varName}}}${after}`;
    onChange(next);
    setSuggestions([]);
    const cursor = matchStart + 2 + varName.length + 2;
    requestAnimationFrame(() => inputRef.current?.setSelectionRange(cursor, cursor));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        pick(suggestions[activeIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }
    outerKeyDown?.(e);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    // Delay so onMouseDown on a suggestion item fires first
    setTimeout(() => setSuggestions([]), 150);
    outerBlur?.(e);
  }

  const open = suggestions.length > 0 && !disabled;

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onSelect={handleSelect}
        disabled={disabled}
        className={className}
        {...props}
      />
      {open && (
        <ul className="absolute left-0 top-full mt-0.5 z-50 bg-gray-900 border border-gray-700 rounded shadow-lg max-h-40 overflow-y-auto min-w-max w-full">
          {suggestions.map((s, i) => (
            <li
              key={s}
              className={`px-2 py-1 text-xs font-mono cursor-pointer whitespace-nowrap ${
                i === activeIdx ? 'bg-violet-600 text-white' : 'text-violet-300 hover:bg-gray-800'
              }`}
              onMouseDown={(e) => { e.preventDefault(); pick(s); }}
            >
              {`{{${s}}}`}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

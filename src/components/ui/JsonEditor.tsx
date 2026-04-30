import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { oneDark } from '@codemirror/theme-one-dark';

interface JsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  plainText?: boolean;
}

export function JsonEditor({
  value,
  onChange,
  placeholder,
  disabled = false,
  minHeight = '120px',
  plainText = false,
}: JsonEditorProps) {
  return (
    <div className="rounded border border-gray-700 overflow-hidden text-xs" style={{ minHeight }}>
      <CodeMirror
        value={value}
        onChange={onChange}
        extensions={plainText ? [] : [json()]}
        theme={oneDark}
        editable={!disabled}
        placeholder={placeholder}
        basicSetup={{
          lineNumbers: true,
          foldGutter: false,
          highlightActiveLineGutter: false,
          highlightActiveLine: !disabled,
          autocompletion: !plainText,
        }}
        style={{ fontSize: '12px', minHeight }}
      />
    </div>
  );
}

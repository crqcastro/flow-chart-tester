import type { HttpMethod } from '../../types/swagger';

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:     'bg-blue-600 text-blue-100',
  POST:    'bg-green-600 text-green-100',
  PUT:     'bg-amber-600 text-amber-100',
  PATCH:   'bg-violet-600 text-violet-100',
  DELETE:  'bg-red-600 text-red-100',
  HEAD:    'bg-slate-600 text-slate-100',
  OPTIONS: 'bg-slate-600 text-slate-100',
};

interface BadgeProps {
  method: HttpMethod;
  className?: string;
}

export function Badge({ method, className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded ${METHOD_COLORS[method]} ${className}`}>
      {method}
    </span>
  );
}

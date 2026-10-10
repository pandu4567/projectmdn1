export const fmtThousands = (n: number) => (n ? Math.round(n).toLocaleString("id-ID") : "");
export const parseThousands = (s: string) => Number(s.replace(/\D/g, "")) || 0;

export function MoneyInput({ value, onChange, className, placeholder, ...rest }: {
  value: number;
  onChange: (n: number) => void;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      placeholder={placeholder}
      value={fmtThousands(value)}
      onChange={(e) => onChange(parseThousands(e.target.value))}
      {...rest}
    />
  );
}

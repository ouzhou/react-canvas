import { useLingui } from "@lingui/react/macro";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** 供 `<input type="color">` 使用的 #rrggbb，非法时退回 #000000。 */
export function hexForColorInput(raw: string): string {
  const t = raw.trim();
  if (/^#[0-9A-Fa-f]{6}$/i.test(t)) {
    return t.slice(0, 7).toLowerCase();
  }
  if (/^#[0-9A-Fa-f]{3}$/i.test(t)) {
    const r = t[1]!;
    const g = t[2]!;
    const b = t[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return "#000000";
}

type ColorFieldProps = {
  value: string;
  onChange?: (hexOrText: string) => void;
  /** value 为空或无法用 CSS 展示时的预览底色 */
  previewFallback?: string;
  readOnly?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
};

/**
 * 原生颜色选择器 + 文本框，便于在属性面板里改 hex。
 */
export function ColorField({
  value,
  onChange,
  previewFallback = "#000000",
  readOnly = false,
  placeholder = "#0f172a",
  className,
  inputClassName,
}: ColorFieldProps) {
  const { t } = useLingui();
  const swatchBg = value.trim() || previewFallback;
  const pickerValue = hexForColorInput(value);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border border-input bg-background p-2",
        readOnly && "opacity-90",
        className,
      )}
    >
      <label
        className={cn(
          "relative size-7 shrink-0 overflow-hidden rounded border border-slate-200 shadow-sm",
          readOnly ? "cursor-default" : "cursor-pointer",
        )}
      >
        <span
          className="pointer-events-none absolute inset-0 block"
          style={{ backgroundColor: swatchBg }}
          aria-hidden
        />
        <input
          type="color"
          className={cn(
            "absolute inset-0 h-full w-full opacity-0",
            readOnly ? "pointer-events-none" : "cursor-pointer",
          )}
          value={pickerValue}
          onChange={readOnly || !onChange ? undefined : (e) => onChange(e.target.value)}
          title={t`选择颜色`}
          tabIndex={readOnly ? -1 : undefined}
        />
      </label>
      <Input
        className={cn("h-8 flex-1 font-mono text-xs", inputClassName)}
        placeholder={placeholder}
        value={value}
        readOnly={readOnly}
        onChange={readOnly || !onChange ? undefined : (e) => onChange(e.target.value)}
        spellCheck={false}
      />
    </div>
  );
}

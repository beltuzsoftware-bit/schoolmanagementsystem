import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, onFocus, onChange, ...props }: React.ComponentProps<"textarea">) {
  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (e.target.value && /^(0+|New Location|New Address)$/i.test(e.target.value)) {
      const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
      if (setValue) {
        setValue.call(e.target, '');
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
      } else {
        e.target.value = '';
      }
    }
    if (onFocus) {
      onFocus(e);
    }
  };

  return (
    <textarea
      data-slot="textarea"
      onFocus={handleFocus}
      onChange={onChange}
      className={cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }

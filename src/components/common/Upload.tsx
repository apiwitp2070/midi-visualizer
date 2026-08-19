import { cn } from "@/utils/cn";
import { useState } from "react";

type UploadProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Merged onto the drop-zone label. `className` targets the hidden input. */
  labelClassName?: string;
};

export default function Upload({ labelClassName, ...props }: UploadProps) {
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFileNames(Array.from(files).map((file) => file.name));
    }

    // Call external onChange if provided
    props.onChange?.(e);
  };

  const hasFile = fileNames.length > 0;

  return (
    <label
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg px-4 py-6 text-center",
        "border border-dashed transition-[border-color,background-color]",
        // The focus ring lives here: the input itself is visually hidden, so
        // keyboard users would otherwise get no focus affordance at all.
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
        hasFile
          ? "border-accent/60 bg-accent/5"
          : "border-border bg-surface-raised hover:border-accent hover:bg-surface-sunken",
        labelClassName
      )}
      htmlFor="File"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        aria-hidden
        className={cn(
          "size-6 transition-colors",
          hasFile ? "text-accent" : "text-text-muted group-hover:text-accent"
        )}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
        />
      </svg>

      {hasFile ? (
        <span className="max-w-full truncate font-mono text-xs text-text">
          {fileNames[0]}
        </span>
      ) : (
        <span className="text-sm font-medium text-text">
          Choose a MIDI file
        </span>
      )}

      <span className="text-xs text-text-muted">
        {hasFile ? "Choose another file" : ".mid or .midi"}
      </span>

      <input
        multiple
        type="file"
        id="File"
        {...props}
        className={cn("sr-only", props.className)}
        onChange={handleChange}
      />
    </label>
  );
}

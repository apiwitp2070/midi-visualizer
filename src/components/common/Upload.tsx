import { cn } from "@/utils/cn";
import { useId } from "react";
import { useMidiVisualization } from "@/context/useMidiVisualization";
import { UploadIcon } from "./icons";

const MIDI_ACCEPT = ".mid,.midi,audio/midi";

type UploadProps = React.InputHTMLAttributes<HTMLInputElement> & {
  /** Merged onto the drop-zone label. `className` targets the hidden input. */
  labelClassName?: string;
  compact?: boolean;
};

export default function Upload({
  labelClassName,
  compact,
  ...props
}: UploadProps) {
  const { fileName } = useMidiVisualization();
  const hasFile = Boolean(fileName);

  const inputId = useId();

  const input = (
    <input
      multiple
      type="file"
      id={inputId}
      accept={MIDI_ACCEPT}
      {...props}
      className={cn("sr-only", props.className)}
    />
  );

  if (compact) {
    return (
      <label
        htmlFor={inputId}
        title={fileName ?? "Load a MIDI file"}
        className={cn(
          "flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-md",
          "transition-colors hover:bg-surface-raised",
          "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
          hasFile ? "text-accent" : "text-text-muted hover:text-text",
          labelClassName,
        )}
      >
        <UploadIcon />
        <span className="sr-only">
          {fileName
            ? `Loaded: ${fileName}. Choose another file`
            : "Load a MIDI file"}
        </span>
        {input}
      </label>
    );
  }

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
        labelClassName,
      )}
      htmlFor={inputId}
    >
      <UploadIcon
        className={cn(
          "size-6 transition-colors",
          hasFile ? "text-accent" : "text-text-muted group-hover:text-accent",
        )}
      />

      {hasFile ? (
        <span className="max-w-full truncate font-mono text-xs text-text">
          {fileName}
        </span>
      ) : (
        <span className="text-sm font-medium text-text">
          Choose a MIDI file
        </span>
      )}

      <span className="text-xs text-text-muted">
        {hasFile ? "Choose another file" : ".mid or .midi"}
      </span>

      {input}
    </label>
  );
}

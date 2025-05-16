import { useState } from "react";

interface UploadProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export default function Upload({ ...props }: UploadProps) {
  const [fileNames, setFileNames] = useState<string[]>([]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setFileNames(Array.from(files).map((file) => file.name));
    }

    // Call external onChange if provided
    props.onChange?.(e);
  };

  return (
    <label
      className="block rounded border border-gray-300 p-4 text-gray-900 shadow-sm sm:p-6 cursor-pointer"
      htmlFor="File"
    >
      <div className="flex items-center justify-center gap-4 font-medium">
        {fileNames.length ? (
          fileNames[0]
        ) : (
          <>
            <span> Upload your file(s) </span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="size-6"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
              />
            </svg>
          </>
        )}
      </div>

      <input
        multiple
        type="file"
        id="File"
        className="sr-only"
        {...props}
        onChange={handleChange}
      />
    </label>
  );
}

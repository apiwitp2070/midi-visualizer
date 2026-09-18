const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  fill: "none",
  viewBox: "0 0 24 24",
  strokeWidth: 1.5,
  stroke: "currentColor",
  className: "size-5",
  "aria-hidden": true,
} as const;

type IconProps = { className?: string };

export const PlayIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} fill="currentColor" stroke="none" className={className}>
    <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653Z" />
  </svg>
);

export const StopIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} fill="currentColor" stroke="none" className={className}>
    <path d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z" />
  </svg>
);

export const UploadIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m0-3-3-3m0 0-3 3m3-3v11.25m6-2.25h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
    />
  </svg>
);

export const PanelToggleIcon = ({ className = "size-5" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M9 5v14" />
    <path
      d="M9 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4z"
      fill="currentColor"
      opacity="0.35"
    />
  </svg>
);

export const DownloadIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14"
    />
  </svg>
);

export const ChevronUpIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m5 15 7-7 7 7" />
  </svg>
);

export const ChevronDownIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
  </svg>
);

export const MinusIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" d="M5 12h14" />
  </svg>
);

export const PlusIcon = ({ className = "size-4" }: IconProps) => (
  <svg {...iconProps} className={className}>
    <path strokeLinecap="round" d="M12 5v14M5 12h14" />
  </svg>
);

import type { HTMLAttributes, SVGProps } from "react";
import { cn } from "../utils/cn";

type HugeIconProps = HTMLAttributes<HTMLElement>;
type SvgIconProps = SVGProps<SVGSVGElement>;

/**
 * Decorative icon stroke color.
 * Dark: amber accent. Light: zinc (see --icon-accent in styles.css).
 * Semantic overrides (red/green) still win via className + twMerge.
 */
const ICON_ACCENT = "text-icon-accent";

function HugeIcon({ name, className, ...props }: HugeIconProps & { name: string }) {
  return (
    <i
      className={cn("hgi hgi-stroke hgi-rounded", name, ICON_ACCENT, className)}
      aria-hidden="true"
      {...props}
    />
  );
}

function SvgIcon({ className, children, ...props }: SvgIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      className={cn(ICON_ACCENT, className)}
      {...props}
    >
      {children}
    </svg>
  );
}

export function CopyIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-copy" className={className} {...props} />;
}

export function TrashIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-delete-04" className={cn("text-red-400", className)} {...props} />;
}

export function ExternalLinkIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-link-square-02" className={className} {...props} />;
}

export function FileIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-file-02" className={className} {...props} />;
}

export function SettingsIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-5", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </SvgIcon>
  );
}

export function UploadIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-5", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </SvgIcon>
  );
}

export function FolderIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-folder-02" className={className} {...props} />;
}

export function KeyIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-5", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
    </SvgIcon>
  );
}

export function CheckIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={2} className={cn("size-4 text-green-400", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </SvgIcon>
  );
}

export function RefreshIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </SvgIcon>
  );
}

export function ArrowLeftIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </SvgIcon>
  );
}

/** Worker endpoint input / list — Hugeicons `hgi-server-stack-01`. */
export function ServerIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-server-stack-01" className={className} {...props} />;
}

/** Domain / custom domain — Hugeicons `hgi-globe`. */
export function GlobeIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-globe" className={className} {...props} />;
}

/** Multi-bucket binding dropdown — Hugeicons `hgi-database-01`. */
export function BucketIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-database-01" className={className} {...props} />;
}

export function ChevronDownIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={2} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </SvgIcon>
  );
}

export function ChevronUpIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={2} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </SvgIcon>
  );
}

export function ImageIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-image-03" className={className} {...props} />;
}

export function CodeIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-5", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
    </SvgIcon>
  );
}

export function HelpIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={1.8} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </SvgIcon>
  );
}

export function ArrowUpIcon({ className, ...props }: SvgIconProps) {
  return (
    <SvgIcon strokeWidth={2} className={cn("size-4", className)} {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
    </SvgIcon>
  );
}

/** Theme switcher “sun” (shown in dark mode). */
export function SunIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-sun-01" className={className} {...props} />;
}

/** Theme switcher “moon” (shown in light mode). */
export function MoonIcon({ className, ...props }: HugeIconProps) {
  return <HugeIcon name="hgi-moon-02" className={className} {...props} />;
}

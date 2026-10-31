import type { IconInputProps } from "../types/ui";

/** Text input with a leading decorative icon, using the shared `.field` style. */
export function IconInput({ icon, className = "", ...props }: IconInputProps) {
  return (
    <div className="relative">
      <span className="field-icon">{icon}</span>
      <input className={`field field-with-icon ${className}`} {...props} />
    </div>
  );
}

import type { InputHTMLAttributes, ReactNode } from "react";

export interface IconInputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
}

export type ToastTone = "error" | "success";

export interface ToastsProps {
  error: string | null;
  status: string | null;
  onDismissError: () => void;
  onDismissStatus: () => void;
}

export interface ToastProps {
  tone: ToastTone;
  message: string;
  onDismiss: () => void;
}

export interface SettingsSectionProps {
  title: string;
  children: ReactNode;
}

export interface SwitchRowProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

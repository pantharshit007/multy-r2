import { FormEvent, useEffect, useRef, useState } from "react";
import type { EndpointRecord, DuplicateStrategy, ImageOutputFormat } from "../../shared";
import { saveEndpointRecord } from "../api";
import { WorkerBucketPicker } from "./WorkerBucketPicker";
import { SETTINGS_SAVED_FEEDBACK_MS } from "../constants";
import { SettingsIcon, ServerIcon, KeyIcon, GlobeIcon, ChevronDownIcon, ChevronUpIcon, ImageIcon } from "./Icons";

interface SettingsPanelProps {
  record: EndpointRecord;
  onUpdated: (record: EndpointRecord) => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

export function SettingsPanel({
  record,
  onUpdated,
  onError,
  onStatus,
}: SettingsPanelProps) {
  const [form, setForm] = useState(() => ({ ...record, uploadSettings: { ...record.uploadSettings } }));
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [imageSettingsOpen, setImageSettingsOpen] = useState(false);
  const saveFeedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    setForm(record);
  }, [record]);

  useEffect(() => {
    return () => {
      if (saveFeedbackTimer.current !== null) window.clearTimeout(saveFeedbackTimer.current);
    };
  }, []);

  function markSaved() {
    setSaveState("saved");
    if (saveFeedbackTimer.current !== null) window.clearTimeout(saveFeedbackTimer.current);
    saveFeedbackTimer.current = window.setTimeout(() => setSaveState("idle"), SETTINGS_SAVED_FEEDBACK_MS);
  }

  function updateForm(next: EndpointRecord) {
    setForm(next);
    const records = saveEndpointRecord(next);
    const persisted = records.find((item) => item.id === record.id) ?? next;
    onUpdated(persisted);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    try {
      const records = saveEndpointRecord(form);
      const next = records.find((item) => item.id === record.id) ?? record;
      setForm(next);
      onUpdated(next);
      onStatus("Endpoint settings saved");
      markSaved();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Could not save endpoint");
    }
  }

  return (
    <aside className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 lg:sticky lg:top-4 lg:self-start">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        <SettingsIcon className="size-4 text-zinc-600" />
        <span>Settings</span>
      </div>
      <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50 font-display">Endpoint Panel</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        Control credentials, custom domains, duplicate file behavior, and image transformation properties.
      </p>

      <form className="mt-5 grid gap-4.5" onSubmit={save}>
        {/* Workers Endpoint URL */}
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          <span>Workers Endpoint</span>
          <div className="relative">
            <ServerIcon className="absolute left-3 top-3.5 size-4 text-zinc-600" />
            <input
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
              value={form.endPoint}
              onChange={(event) => updateForm({ ...form, endPoint: event.target.value })}
              required
            />
          </div>
        </label>

        {/* API Key */}
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          <span>API Key</span>
          <div className="relative">
            <KeyIcon className="absolute left-3 top-3.5 size-4 text-zinc-600" />
            <input
              className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
              value={form.apiKey}
              onChange={(event) => updateForm({ ...form, apiKey: event.target.value })}
              type="password"
              required
            />
          </div>
        </label>

        {/* Custom Domain (only if workerBucketMode is false) */}
        {form.workerBucketMode ? null : (
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            <span>Custom Domain</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-zinc-600">
                <GlobeIcon className="size-4" />
              </span>
              <input
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                value={form.customDomain}
                onChange={(event) => updateForm({ ...form, customDomain: event.target.value })}
                placeholder="https://r2.example.com"
              />
            </div>
            <span className="text-[10px] leading-relaxed text-zinc-500 mt-1 block">
              Enter the full URL including <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">https://</code>. Leave blank to share files through the Worker endpoint directly.
            </span>
          </label>
        )}

        {/* Worker Bucket Picker Component */}
        <WorkerBucketPicker
          enabled={form.workerBucketMode}
          endpoint={form.endPoint}
          apiKey={form.apiKey}
          bucketId={form.bucketId}
          bucketName={form.bucketName}
          bucketBindingName={form.bucketBindingName}
          bucketDomains={form.bucketDomains}
          onEnabledChange={(enabled) => updateForm({
            ...form,
            workerBucketMode: enabled,
            bucketId: enabled ? form.bucketId : "",
            bucketName: enabled ? form.bucketName : "",
            bucketBindingName: enabled ? form.bucketBindingName : "",
          })}
          onBucketChange={(bucket) => updateForm({
            ...form,
            workerBucketMode: form.workerBucketMode,
            bucketId: bucket?.id ?? "",
            bucketName: bucket?.name ?? "",
            bucketBindingName: bucket?.bindingName ?? "",
          })}
          onBucketDomainsChange={(next) => updateForm({ ...form, bucketDomains: next })}
        />

        {/* Duplicate Strategy Selector */}
        <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
          <span>Duplicate Handling</span>
          <div className="relative">
            <select
              className="h-11 w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all cursor-pointer"
              value={form.uploadSettings.duplicateStrategy}
              onChange={(event) => updateForm({ ...form, uploadSettings: { ...form.uploadSettings, duplicateStrategy: event.target.value as DuplicateStrategy } })}
            >
              <option value="keep">Overwrite / Replace</option>
              <option value="skip">Skip file if key exists</option>
              <option value="rename">Rename with random ID suffix</option>
            </select>
            <ChevronDownIcon className="absolute right-3.5 top-3.5 size-4 text-zinc-500 pointer-events-none" />
          </div>
          <span className="text-[10px] leading-relaxed text-zinc-500 mt-1 block">
            Overwrite replaces existing objects, while renaming appends a short random identifier to make each upload unique.
          </span>
        </label>

        {/* Collapsible Image Upload Settings */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 overflow-hidden hover:border-zinc-700 transition-all duration-200">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-zinc-900/20 transition-all cursor-pointer"
            onClick={() => setImageSettingsOpen(!imageSettingsOpen)}
          >
            <div className="flex items-center gap-2">
              <ImageIcon className="size-4 text-zinc-500" />
              <span className="text-xs font-bold text-zinc-300 font-display">Image Upload Processing</span>
            </div>
            {imageSettingsOpen ? (
              <ChevronUpIcon className="size-4 text-zinc-500" />
            ) : (
              <ChevronDownIcon className="size-4 text-zinc-500" />
            )}
          </button>

          {imageSettingsOpen && (
            <div className="grid gap-3.5 p-4 border-t border-zinc-800 bg-zinc-950/10">
              {/* Compress checkbox */}
              <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2.5 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="pr-2">
                  <span className="block font-semibold">Compress images locally</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-500">
                    Resizes and optimizes images before uploading to R2.
                  </span>
                </span>
                <input
                  checked={form.uploadSettings.imageUploadSettings.compressImagesBeforeUploading}
                  className="mt-0.5 h-4.5 w-4.5 rounded border-zinc-800 accent-amber-300 bg-zinc-900 cursor-pointer"
                  type="checkbox"
                  onChange={(event) => updateForm({
                    ...form,
                    uploadSettings: {
                      ...form.uploadSettings,
                      imageUploadSettings: {
                        ...form.uploadSettings.imageUploadSettings,
                        compressImagesBeforeUploading: event.target.checked,
                      },
                    },
                  })}
                />
              </label>

              {/* Remove EXIF checkbox */}
              <label className="flex items-start justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/20 px-3 py-2.5 text-xs text-zinc-300 cursor-pointer hover:border-zinc-700 transition-colors">
                <span className="pr-2">
                  <span className="block font-semibold">Strip metadata (EXIF)</span>
                  <span className="mt-0.5 block text-[10px] leading-relaxed text-zinc-500">
                    Removes camera details, GPS coordinates, and timestamps.
                  </span>
                </span>
                <input
                  checked={form.uploadSettings.imageUploadSettings.removeExif}
                  className="mt-0.5 h-4.5 w-4.5 rounded border-zinc-800 accent-amber-300 bg-zinc-900 cursor-pointer"
                  type="checkbox"
                  onChange={(event) => updateForm({
                    ...form,
                    uploadSettings: {
                      ...form.uploadSettings,
                      imageUploadSettings: {
                        ...form.uploadSettings.imageUploadSettings,
                        removeExif: event.target.checked,
                      },
                    },
                  })}
                />
              </label>

              {/* Format selection */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                <span>Output Format</span>
                <div className="relative">
                  <select
                    className="h-10 w-full appearance-none rounded-xl border border-zinc-850 bg-zinc-900/60 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all cursor-pointer"
                    value={form.uploadSettings.imageUploadSettings.outputFormat}
                    onChange={(event) => updateForm({
                      ...form,
                      uploadSettings: {
                        ...form.uploadSettings,
                        imageUploadSettings: {
                          ...form.uploadSettings.imageUploadSettings,
                          outputFormat: event.target.value as ImageOutputFormat,
                        },
                      },
                    })}
                  >
                    <option value="webp">WebP (recommended)</option>
                    <option value="jpeg">JPEG</option>
                    <option value="png">PNG</option>
                  </select>
                  <ChevronDownIcon className="absolute right-3 top-3 size-4 text-zinc-500 pointer-events-none" />
                </div>
              </label>

              {/* Image quality */}
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                <span>Compression Quality (0.05 - 1.0)</span>
                <input
                  className="h-10 w-full rounded-xl border border-zinc-850 bg-zinc-900/60 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all"
                  min="0.05"
                  max="1"
                  step="0.05"
                  type="number"
                  value={form.uploadSettings.imageUploadSettings.imageQuality}
                  onChange={(event) => updateForm({
                    ...form,
                    uploadSettings: {
                      ...form.uploadSettings,
                      imageUploadSettings: {
                        ...form.uploadSettings.imageUploadSettings,
                        imageQuality: Number(event.target.value),
                      },
                    },
                  })}
                />
              </label>

              {/* Max Dimensions */}
              <div className="grid gap-3 grid-cols-2">
                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                  <span>Max Width</span>
                  <input
                    className="h-10 w-full rounded-xl border border-zinc-850 bg-zinc-900/60 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all"
                    min="1"
                    placeholder="None"
                    type="number"
                    value={form.uploadSettings.imageUploadSettings.maxWidth ?? ""}
                    onChange={(event) => updateForm({
                      ...form,
                      uploadSettings: {
                        ...form.uploadSettings,
                        imageUploadSettings: {
                          ...form.uploadSettings.imageUploadSettings,
                          maxWidth: event.target.value ? Number(event.target.value) : null,
                        },
                      },
                    })}
                  />
                </label>

                <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                  <span>Max Height</span>
                  <input
                    className="h-10 w-full rounded-xl border border-zinc-850 bg-zinc-900/60 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all"
                    min="1"
                    placeholder="None"
                    type="number"
                    value={form.uploadSettings.imageUploadSettings.maxHeight ?? ""}
                    onChange={(event) => updateForm({
                      ...form,
                      uploadSettings: {
                        ...form.uploadSettings,
                        imageUploadSettings: {
                          ...form.uploadSettings.imageUploadSettings,
                          maxHeight: event.target.value ? Number(event.target.value) : null,
                        },
                      },
                    })}
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Submit Save Button */}
        <button
          className={`h-11 w-full rounded-xl text-sm font-semibold transition-all duration-300 active:scale-98 cursor-pointer shadow-md ${
            saveState === "saved"
              ? "bg-green-500 text-zinc-950 hover:bg-green-400 shadow-green-500/10"
              : "bg-zinc-50 text-zinc-950 hover:bg-amber-200 shadow-white/5"
          }`}
          type="submit"
        >
          {saveState === "saved" ? "Settings Saved" : "Save settings"}
        </button>
      </form>
    </aside>
  );
}

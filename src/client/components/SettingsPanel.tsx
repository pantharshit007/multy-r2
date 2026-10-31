import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import type { EndpointRecord, DuplicateStrategy, ImageOutputFormat, ImageUploadSettings } from "../../shared";
import { saveEndpointRecord } from "../api";
import { WorkerBucketPicker } from "./WorkerBucketPicker";
import { SETTINGS_SAVED_FEEDBACK_MS } from "../constants";
import { IconInput } from "./IconInput";
import { SettingsIcon, ServerIcon, KeyIcon, GlobeIcon, ChevronDownIcon, ImageIcon, CheckIcon } from "./Icons";

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

  /** Patch image processing options and persist immediately. */
  function updateImage(patch: Partial<ImageUploadSettings>) {
    updateForm({
      ...form,
      uploadSettings: {
        ...form.uploadSettings,
        imageUploadSettings: { ...form.uploadSettings.imageUploadSettings, ...patch },
      },
    });
  }

  const image = form.uploadSettings.imageUploadSettings;

  return (
    <aside className="panel min-w-0" aria-labelledby="settings-heading">
      <div className="panel-header">
        <h2 id="settings-heading" className="panel-title flex items-center gap-2">
          <SettingsIcon className="size-4 text-muted" />
          Endpoint settings
        </h2>
      </div>

      <form onSubmit={save}>
        <SettingsSection title="Connection">
          <label className="grid gap-1.5">
            <span className="label">Worker URL</span>
            <IconInput
              icon={<ServerIcon className="size-4" />}
              value={form.endPoint}
              onChange={(event) => updateForm({ ...form, endPoint: event.target.value })}
              required
            />
          </label>

          <label className="grid gap-1.5">
            <span className="label">API key</span>
            <IconInput
              icon={<KeyIcon className="size-4" />}
              value={form.apiKey}
              onChange={(event) => updateForm({ ...form, apiKey: event.target.value })}
              type="password"
              autoComplete="off"
              required
            />
          </label>

          {form.workerBucketMode ? null : (
            <label className="grid gap-1.5">
              <span className="label">Custom domain <span className="font-normal text-subtle">(optional)</span></span>
              <IconInput
                icon={<GlobeIcon className="size-4" />}
                value={form.customDomain}
                onChange={(event) => updateForm({ ...form, customDomain: event.target.value })}
                placeholder="https://r2.example.com"
              />
              <span className="hint">
                Used for share links. Include <code className="code-inline">https://</code>. Leave blank to share through the Worker URL.
              </span>
            </label>
          )}
        </SettingsSection>

        <SettingsSection title="Buckets">
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
        </SettingsSection>

        <SettingsSection title="Uploads">
          <label className="grid gap-1.5">
            <span className="label">When a file already exists</span>
            <div className="relative">
              <select
                className="field cursor-pointer appearance-none pr-9"
                value={form.uploadSettings.duplicateStrategy}
                onChange={(event) => updateForm({ ...form, uploadSettings: { ...form.uploadSettings, duplicateStrategy: event.target.value as DuplicateStrategy } })}
              >
                <option value="keep">Overwrite it</option>
                <option value="skip">Skip the upload</option>
                <option value="rename">Add a random suffix</option>
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-3 right-3 size-4 text-subtle" />
            </div>
          </label>

          <div className="rounded-xl border border-line">
            <button
              type="button"
              className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3.5 py-3 text-left hover:bg-raised/60"
              aria-expanded={imageSettingsOpen}
              onClick={() => setImageSettingsOpen(!imageSettingsOpen)}
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <ImageIcon className="size-4 text-muted" />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-fg">Image processing</span>
                  <span className="block truncate text-xs text-subtle">
                    {image.compressImagesBeforeUploading ? `Compress to ${image.outputFormat.toUpperCase()}` : "Upload images as-is"}
                    {image.removeExif ? ", strip EXIF" : ""}
                  </span>
                </span>
              </span>
              <ChevronDownIcon className={`size-4 shrink-0 text-subtle transition-transform ${imageSettingsOpen ? "rotate-180" : ""}`} />
            </button>

            {imageSettingsOpen && (
              <div className="grid gap-4 border-t border-line p-3.5">
                <SwitchRow
                  label="Compress before upload"
                  description="Resize and re-encode images in the browser."
                  checked={image.compressImagesBeforeUploading}
                  onChange={(checked) => updateImage({ compressImagesBeforeUploading: checked })}
                />
                <SwitchRow
                  label="Strip metadata"
                  description="Remove EXIF data such as camera details and GPS location."
                  checked={image.removeExif}
                  onChange={(checked) => updateImage({ removeExif: checked })}
                />

                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5">
                    <span className="label">Format</span>
                    <div className="relative">
                      <select
                        className="field cursor-pointer appearance-none pr-8"
                        value={image.outputFormat}
                        onChange={(event) => updateImage({ outputFormat: event.target.value as ImageOutputFormat })}
                      >
                        <option value="webp">WebP</option>
                        <option value="jpeg">JPEG</option>
                        <option value="png">PNG</option>
                      </select>
                      <ChevronDownIcon className="pointer-events-none absolute top-3 right-2.5 size-4 text-subtle" />
                    </div>
                  </label>

                  <label className="grid gap-1.5">
                    <span className="label">Quality</span>
                    <input
                      className="field"
                      min="0.05"
                      max="1"
                      step="0.05"
                      type="number"
                      value={image.imageQuality}
                      onChange={(event) => updateImage({ imageQuality: Number(event.target.value) })}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="label">Max width</span>
                    <input
                      className="field"
                      min="1"
                      placeholder="Any"
                      type="number"
                      value={image.maxWidth ?? ""}
                      onChange={(event) => updateImage({ maxWidth: event.target.value ? Number(event.target.value) : null })}
                    />
                  </label>

                  <label className="grid gap-1.5">
                    <span className="label">Max height</span>
                    <input
                      className="field"
                      min="1"
                      placeholder="Any"
                      type="number"
                      value={image.maxHeight ?? ""}
                      onChange={(event) => updateImage({ maxHeight: event.target.value ? Number(event.target.value) : null })}
                    />
                  </label>
                </div>
                <p className="hint">Quality ranges from 0.05 to 1. WebP gives the smallest files.</p>
              </div>
            )}
          </div>
        </SettingsSection>

        <div className="grid gap-2 p-5">
          <button
            className={`btn h-10 w-full ${saveState === "saved" ? "bg-success/15 text-success" : "btn-secondary"}`}
            type="submit"
          >
            {saveState === "saved" ? <><CheckIcon className="size-4" /> Saved</> : "Save settings"}
          </button>
          <p className="hint text-center">Settings are stored in this browser only.</p>
        </div>
      </form>
    </aside>
  );
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-b border-line px-5 py-5">
      <h3 className="text-xs font-medium text-subtle">{title}</h3>
      {children}
    </section>
  );
}

function SwitchRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span>
        <span className="block text-[13px] font-medium text-fg">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
      </span>
      <input className="switch" type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

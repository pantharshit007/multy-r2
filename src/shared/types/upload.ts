export type DuplicateStrategy = "keep" | "skip" | "rename";

export type ImageOutputFormat = "webp" | "jpeg" | "png";

export interface ImageUploadSettings {
  compressImagesBeforeUploading: boolean;
  removeExif: boolean;
  outputFormat: ImageOutputFormat;
  maxWidth: number | null;
  maxHeight: number | null;
  imageQuality: number;
}

export interface UploadSettings {
  duplicateStrategy: DuplicateStrategy;
  imageUploadSettings: ImageUploadSettings;
}

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  duplicateStrategy: "keep",
  imageUploadSettings: {
    compressImagesBeforeUploading: true,
    removeExif: true,
    outputFormat: "webp",
    maxWidth: null,
    maxHeight: null,
    imageQuality: 0.8,
  },
};

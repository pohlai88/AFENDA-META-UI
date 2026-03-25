export type UploadKind = "file" | "image";

export interface UploadedAsset {
  url: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  kind: UploadKind;
}

export async function uploadAsset(
  file: File,
  options?: {
    kind?: UploadKind;
    signal?: AbortSignal;
  }
): Promise<UploadedAsset> {
  const kind: UploadKind = options?.kind ?? (file.type.startsWith("image/") ? "image" : "file");

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`/api/uploads?kind=${encodeURIComponent(kind)}`, {
    method: "POST",
    body: formData,
    signal: options?.signal,
  });

  if (!response.ok) {
    const fallback = `Upload failed (${response.status})`;

    try {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error || fallback);
    } catch {
      throw new Error(fallback);
    }
  }

  return response.json() as Promise<UploadedAsset>;
}

import sharp from "sharp";
import { createServiceRoleClient } from "./supabase-server";
import { CB_BASE, cbHeaders } from "./cricbuzz";

const BUCKET = "ipl-images";
const TARGET_BYTES = 40 * 1024; // 40 KB

/**
 * Fetch a Cricbuzz image, convert to WebP at ~40KB, upload to Supabase Storage.
 * Returns the public bucket URL, or null on any failure.
 *
 * @param cbImageId  Cricbuzz image ID (numeric string), e.g. "231889"
 * @param storagePath  Path inside the bucket, e.g. "news/123.webp" or "players/456.webp"
 * @param sizeParam  Cricbuzz size param: "thumb" (default), "gthumb", or "" for full size
 */
export async function fetchAndStoreImage(
  cbImageId: string,
  storagePath: string,
  sizeParam: "thumb" | "gthumb" | "" = "thumb"
): Promise<string | null> {
  try {
    const qs = sizeParam ? `?p=${sizeParam}` : "";
    const imageUrl = `${CB_BASE}/img/v1/i1/c${cbImageId}/i.jpg${qs}`;
    const res = await fetch(imageUrl, { headers: cbHeaders() });
    if (!res.ok) return null;

    const inputBuffer = Buffer.from(await res.arrayBuffer());

    // Convert to WebP, targeting ≤40KB
    // Start at quality 70 and step down by 10 until under budget (floor at 20)
    let quality = 70;
    let webpBuffer: Buffer | null = null;

    while (quality >= 20) {
      webpBuffer = await sharp(inputBuffer)
        .resize({ width: 800, withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();

      if (webpBuffer.length <= TARGET_BYTES) break;
      quality -= 10;
    }

    if (!webpBuffer) return null;

    const supabase = createServiceRoleClient();
    const { error } = await supabase.storage.from(BUCKET).upload(storagePath, webpBuffer, {
      contentType: "image/webp",
      upsert: true,
      cacheControl: "public, max-age=2592000",
    });

    if (error) {
      console.error("[ipl-image] upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  } catch (err) {
    console.error("[ipl-image] fetchAndStoreImage error:", err);
    return null;
  }
}

import crypto from "crypto";

export type MediaFolder = "profile-photos" | "training-videos" | "chat-media";

export class MediaKey {
  /**
   * Generates a unique, structured S3 key.
   * Format: {folder}/{userId}/{timestamp}-{random}.{ext}
   */
  static generate(input: {
    folder: MediaFolder;
    userId: number;
    fileName: string;
  }): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(4).toString("hex");
    const ext = input.fileName.split(".").pop()?.toLowerCase() || "bin";
    
    // Sanitize extension to prevent path traversal or weird files
    const safeExt = ext.replace(/[^a-z0-9]/g, "");
    
    return `${input.folder}/${input.userId}/${timestamp}-${random}.${safeExt}`;
  }

  /**
   * Validates if a key belongs to a specific folder and user.
   * Useful for security checks before saving a URL to the database.
   */
  static validate(key: string, folder: MediaFolder, userId: number): boolean {
    const parts = key.split("/");
    if (parts.length !== 3) return false;
    return parts[0] === folder && parts[1] === String(userId);
  }
}

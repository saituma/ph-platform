import type { ImagePickerOptions } from "expo-image-picker";
import * as ImagePicker from "expo-image-picker";

/**
 * Prefer native dimensions / avoid iOS export presets that force 1080p (e.g. H264_1920x1080).
 * Use for admin (and other) video library picks and camera recordings.
 */
export const VIDEO_PICK_PRESERVE_NATIVE_RESOLUTION: ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  quality: 1,
  videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
  preferredAssetRepresentationMode:
    ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Current,
};

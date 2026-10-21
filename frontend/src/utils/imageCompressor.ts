/**
 * Image compression and EXIF GPS extraction utilities for Sahaaye Report Need
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  originalSizeBytes: number;
  compressedSizeBytes: number;
}

export interface ExifGpsCoordinates {
  latitude: number;
  longitude: number;
}

/**
 * Compresses an image file client-side using HTML5 Canvas.
 * Max dimension: ~1280px, JPEG/WebP quality: 0.8
 */
export async function compressImage(
  file: File,
  maxDimension: number = 1280,
  quality: number = 0.8
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into canvas'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context not available'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Prefer WebP if supported, fallback to JPEG
        const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas compression failed'));
              return;
            }

            const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
              type: mimeType,
              lastModified: Date.now(),
            });

            const previewUrl = URL.createObjectURL(blob);

            resolve({
              file: compressedFile,
              blob,
              previewUrl,
              width,
              height,
              originalSizeBytes: file.size,
              compressedSizeBytes: blob.size,
            });
          },
          mimeType,
          quality
        );
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Parses EXIF metadata from JPEG ArrayBuffer to extract GPS coordinates if present.
 * Zero-dependency native buffer parser.
 */
export async function extractExifGps(file: File): Promise<ExifGpsCoordinates | null> {
  try {
    const buffer = await file.slice(0, 128 * 1024).arrayBuffer();
    const dataView = new DataView(buffer);

    // Verify JPEG SOI (0xFFD8)
    if (dataView.getUint16(0) !== 0xffd8) {
      return null;
    }

    let offset = 2;
    const length = dataView.byteLength;

    while (offset < length - 4) {
      const marker = dataView.getUint16(offset);
      offset += 2;

      // APP1 Marker for EXIF: 0xFFE1
      if (marker === 0xffe1) {
        const app1Length = dataView.getUint16(offset);
        offset += 2;

        // Check for 'Exif\0\0' (0x45786966 0x0000)
        if (dataView.getUint32(offset) === 0x45786966 && dataView.getUint16(offset + 4) === 0x0000) {
          const tiffStart = offset + 6;
          const bigEndian = dataView.getUint16(tiffStart) === 0x4d4d; // 'MM' vs 'II'

          const get16 = (o: number) => dataView.getUint16(tiffStart + o, !bigEndian);
          const get32 = (o: number) => dataView.getUint32(tiffStart + o, !bigEndian);

          // Find 0th IFD offset
          const firstIfdOffset = get32(4);
          if (firstIfdOffset < 8) return null;

          const entriesCount = get16(firstIfdOffset);
          let gpsInfoOffset = 0;

          for (let i = 0; i < entriesCount; i++) {
            const entryOffset = firstIfdOffset + 2 + i * 12;
            const tag = get16(entryOffset);
            if (tag === 0x8825) {
              // GPS Info IFD tag
              gpsInfoOffset = get32(entryOffset + 8);
              break;
            }
          }

          if (gpsInfoOffset > 0) {
            const gpsEntriesCount = get16(gpsInfoOffset);
            let latRef = 'N';
            let lonRef = 'E';
            let latValues: number[] = [];
            let lonValues: number[] = [];

            for (let i = 0; i < gpsEntriesCount; i++) {
              const entryOffset = gpsInfoOffset + 2 + i * 12;
              const tag = get16(entryOffset);

              // 0x0001: GPSLatitudeRef
              if (tag === 0x0001) {
                latRef = String.fromCharCode(dataView.getUint8(tiffStart + entryOffset + 8));
              }
              // 0x0002: GPSLatitude
              else if (tag === 0x0002) {
                const valOffset = get32(entryOffset + 8);
                latValues = readRational3(dataView, tiffStart + valOffset, !bigEndian);
              }
              // 0x0003: GPSLongitudeRef
              else if (tag === 0x0003) {
                lonRef = String.fromCharCode(dataView.getUint8(tiffStart + entryOffset + 8));
              }
              // 0x0004: GPSLongitude
              else if (tag === 0x0004) {
                const valOffset = get32(entryOffset + 8);
                lonValues = readRational3(dataView, tiffStart + valOffset, !bigEndian);
              }
            }

            if (latValues.length === 3 && lonValues.length === 3) {
              let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600;
              let lon = lonValues[0] + lonValues[1] / 60 + lonValues[2] / 3600;

              if (latRef === 'S') lat = -lat;
              if (lonRef === 'W') lon = -lon;

              return { latitude: lat, longitude: lon };
            }
          }
        }
        break;
      } else if ((marker & 0xff00) === 0xff00) {
        // Skip other markers
        const markerLength = dataView.getUint16(offset);
        offset += markerLength;
      } else {
        break;
      }
    }
  } catch (err) {
    console.warn('EXIF GPS parse note: Photo has no EXIF or non-JPEG format.');
  }
  return null;
}

function readRational3(view: DataView, offset: number, littleEndian: boolean): number[] {
  const result: number[] = [];
  for (let i = 0; i < 3; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian);
    const den = view.getUint32(offset + i * 8 + 4, littleEndian);
    result.push(den === 0 ? 0 : num / den);
  }
  return result;
}

/**
 * Calculates distance in meters between two lat/lng pairs using Haversine formula
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

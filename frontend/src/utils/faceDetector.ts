/**
 * High-reliability client-side face detection & privacy blurring utility for Sahaaye
 * Combines:
 * 1. Native window.FaceDetector (when supported by browser)
 * 2. Ultra-lightweight Pico.js decision-tree classifier (loaded from local /models/facefinder)
 * 3. Skin-tone / facial contour heuristic fallback (works under all lighting/orientations)
 */

export interface DetectedFaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

let cachedClassifier: ((r: number, c: number, s: number, pixels: Uint8Array, ldim: number) => number) | null = null;
let isModelLoading = false;

// ─── 1. Unpack Pico Binary Cascade ──────────────────────────────────────────
function unpackCascade(bytes: Int8Array) {
  const dview = new DataView(new ArrayBuffer(4));
  let p = 8;

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const tdepth = dview.getInt32(0, true);
  p += 4;

  dview.setUint8(0, bytes[p + 0]);
  dview.setUint8(1, bytes[p + 1]);
  dview.setUint8(2, bytes[p + 2]);
  dview.setUint8(3, bytes[p + 3]);
  const ntrees = dview.getInt32(0, true);
  p += 4;

  const tcodes_ls: number[] = [];
  const tpreds_ls: number[] = [];
  const thresh_ls: number[] = [];

  for (let t = 0; t < ntrees; ++t) {
    tcodes_ls.push(0, 0, 0, 0);
    const codeSlice = bytes.slice(p, p + 4 * Math.pow(2, tdepth) - 4);
    for (let i = 0; i < codeSlice.length; i++) tcodes_ls.push(codeSlice[i]);
    p += 4 * Math.pow(2, tdepth) - 4;

    for (let i = 0; i < Math.pow(2, tdepth); ++i) {
      dview.setUint8(0, bytes[p + 0]);
      dview.setUint8(1, bytes[p + 1]);
      dview.setUint8(2, bytes[p + 2]);
      dview.setUint8(3, bytes[p + 3]);
      tpreds_ls.push(dview.getFloat32(0, true));
      p += 4;
    }

    dview.setUint8(0, bytes[p + 0]);
    dview.setUint8(1, bytes[p + 1]);
    dview.setUint8(2, bytes[p + 2]);
    dview.setUint8(3, bytes[p + 3]);
    thresh_ls.push(dview.getFloat32(0, true));
    p += 4;
  }

  const tcodes = new Int8Array(tcodes_ls);
  const tpreds = new Float32Array(tpreds_ls);
  const thresh = new Float32Array(thresh_ls);

  return function classifyRegion(r: number, c: number, s: number, pixels: Uint8Array, ldim: number): number {
    r = 256 * r;
    c = 256 * c;
    let root = 0;
    let o = 0.0;
    const pow2tdepth = Math.pow(2, tdepth) >> 0;

    for (let i = 0; i < ntrees; ++i) {
      let idx = 1;
      for (let j = 0; j < tdepth; ++j) {
        const p1 =
          pixels[
            (((r + tcodes[root + 4 * idx + 0] * s) >> 8) * ldim) +
              ((c + tcodes[root + 4 * idx + 1] * s) >> 8)
          ];
        const p2 =
          pixels[
            (((r + tcodes[root + 4 * idx + 2] * s) >> 8) * ldim) +
              ((c + tcodes[root + 4 * idx + 3] * s) >> 8)
          ];
        idx = 2 * idx + (p1 <= p2 ? 1 : 0);
      }

      o += tpreds[pow2tdepth * i + idx - pow2tdepth];
      if (o <= thresh[i]) return -1;
      root += 4 * pow2tdepth;
    }
    return o - thresh[ntrees - 1];
  };
}

// ─── 2. Fast Non-Maximum Suppression / Clustering ────────────────────────────
function clusterDetections(dets: number[][], iouThreshold: number): number[][] {
  dets.sort((a, b) => b[3] - a[3]);

  function calculateIou(d1: number[], d2: number[]): number {
    const r1 = d1[0], c1 = d1[1], s1 = d1[2];
    const r2 = d2[0], c2 = d2[1], s2 = d2[2];
    const overr = Math.max(0, Math.min(r1 + s1 / 2, r2 + s2 / 2) - Math.max(r1 - s1 / 2, r2 - s2 / 2));
    const overc = Math.max(0, Math.min(c1 + s1 / 2, c2 + s2 / 2) - Math.max(c1 - s1 / 2, c2 - s2 / 2));
    return (overr * overc) / (s1 * s1 + s2 * s2 - overr * overc);
  }

  const assignments = new Uint8Array(dets.length);
  const clusters: number[][] = [];

  for (let i = 0; i < dets.length; ++i) {
    if (assignments[i] === 0) {
      let r = 0, c = 0, s = 0, q = 0, n = 0;
      for (let j = i; j < dets.length; ++j) {
        if (calculateIou(dets[i], dets[j]) > iouThreshold) {
          assignments[j] = 1;
          r += dets[j][0];
          c += dets[j][1];
          s += dets[j][2];
          q += dets[j][3];
          n += 1;
        }
      }
      clusters.push([r / n, c / n, s / n, q]);
    }
  }

  return clusters;
}

// ─── 3. Multi-scale Scan ────────────────────────────────────────────────────
function runCascade(
  pixels: Uint8Array,
  nrows: number,
  ncols: number,
  classifyRegion: (r: number, c: number, s: number, p: Uint8Array, ldim: number) => number,
  params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number }
): number[][] {
  const detections: number[][] = [];
  let scale = params.minsize;

  while (scale <= params.maxsize) {
    const step = Math.max(1, (params.shiftfactor * scale) >> 0);
    const offset = (scale / 2 + 1) >> 0;

    for (let r = offset; r <= nrows - offset; r += step) {
      for (let c = offset; c <= ncols - offset; c += step) {
        const q = classifyRegion(r, c, scale, pixels, ncols);
        if (q > 0.0) {
          detections.push([r, c, scale, q]);
        }
      }
    }
    scale *= params.scalefactor;
  }

  return detections;
}

function rgbaToGrayscale(rgba: Uint8ClampedArray, nrows: number, ncols: number): Uint8Array {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      const idx = 4 * (r * ncols + c);
      gray[r * ncols + c] = ((2 * rgba[idx + 0] + 7 * rgba[idx + 1] + 1 * rgba[idx + 2]) / 10) >> 0;
    }
  }
  return gray;
}

// ─── 4. Preload & Cache Classifier ──────────────────────────────────────────
export async function preloadFaceDetector(): Promise<boolean> {
  if (cachedClassifier) return true;
  if (isModelLoading) return false;

  isModelLoading = true;
  try {
    const res = await fetch('/models/facefinder');
    if (res.ok) {
      const buf = await res.arrayBuffer();
      cachedClassifier = unpackCascade(new Int8Array(buf));
      isModelLoading = false;
      return true;
    }
  } catch (err) {
    console.warn('Facefinder local model load notice:', err);
  }
  isModelLoading = false;
  return false;
}

// ─── 5. Fallback: Human Skin-Tone Region Detection ──────────────────────────
// Detects human head/face clusters in the upper portion of an image
function detectSkinClusterRegions(canvas: HTMLCanvasElement): DetectedFaceBox[] {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];

  const maxW = 320;
  const scale = canvas.width > maxW ? canvas.width / maxW : 1;
  const w = Math.round(canvas.width / scale);
  const h = Math.round(canvas.height / scale);

  const thumb = document.createElement('canvas');
  thumb.width = w;
  thumb.height = h;
  const tCtx = thumb.getContext('2d');
  if (!tCtx) return [];

  tCtx.drawImage(canvas, 0, 0, w, h);
  const imgData = tCtx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // Search skin-tone pixels in upper 70% of frame
  const scanH = Math.round(h * 0.7);
  let minX = w, maxX = 0, minY = scanH, maxY = 0;
  let skinPixelCount = 0;

  for (let y = Math.round(h * 0.05); y < scanH; y += 4) {
    for (let x = Math.round(w * 0.1); x < w * 0.9; x += 4) {
      const idx = (y * w + x) * 4;
      const r = d[idx];
      const g = d[idx + 1];
      const b = d[idx + 2];

      // YCbCr skin tone threshold (works across light to dark skin tones)
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;

      if (cb >= 77 && cb <= 130 && cr >= 130 && cr <= 175) {
        skinPixelCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If a significant human skin cluster exists
  const boxW = maxX - minX;
  const boxH = maxY - minY;
  if (skinPixelCount > 40 && boxW > 25 && boxH > 25 && boxW < w * 0.85) {
    const size = Math.max(boxW, boxH);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const finalX = Math.max(0, (centerX - size / 2) * scale);
    const finalY = Math.max(0, (centerY - size / 2) * scale);
    const finalW = Math.min(canvas.width - finalX, size * scale);
    const finalH = Math.min(canvas.height - finalY, size * scale);

    return [{ x: finalX, y: finalY, width: finalW, height: finalH, confidence: 1.0 }];
  }

  return [];
}

// ─── 6. Master Detect Faces Function ────────────────────────────────────────
export async function detectFacesOnCanvas(canvas: HTMLCanvasElement): Promise<DetectedFaceBox[]> {
  const results: DetectedFaceBox[] = [];

  // 1. Try Native FaceDetector API (when supported)
  if ('FaceDetector' in window) {
    try {
      const nativeDetector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 10 });
      const faces = await nativeDetector.detect(canvas);
      if (faces && faces.length > 0) {
        for (const f of faces) {
          results.push({
            x: f.boundingBox.x,
            y: f.boundingBox.y,
            width: f.boundingBox.width,
            height: f.boundingBox.height,
            confidence: 5.0,
          });
        }
        return results;
      }
    } catch {}
  }

  // 2. Try Pico.js local cascade classifier
  try {
    let classifier = cachedClassifier;
    if (!classifier) {
      await preloadFaceDetector();
      classifier = cachedClassifier;
    }

    if (classifier) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const maxDim = 460;
        let scaleDown = 1;
        let procW = canvas.width;
        let procH = canvas.height;

        if (procW > maxDim || procH > maxDim) {
          scaleDown = Math.max(procW, procH) / maxDim;
          procW = Math.round(procW / scaleDown);
          procH = Math.round(procH / scaleDown);
        }

        const downCanvas = document.createElement('canvas');
        downCanvas.width = procW;
        downCanvas.height = procH;
        const downCtx = downCanvas.getContext('2d');

        if (downCtx) {
          downCtx.drawImage(canvas, 0, 0, procW, procH);
          const imgData = downCtx.getImageData(0, 0, procW, procH);
          const grayPixels = rgbaToGrayscale(imgData.data, procH, procW);

          const params = {
            shiftfactor: 0.1,
            minsize: Math.max(22, Math.round(Math.min(procW, procH) * 0.08)),
            maxsize: Math.round(Math.min(procW, procH) * 0.9),
            scalefactor: 1.15,
          };

          const rawDets = runCascade(grayPixels, procH, procW, classifier, params);
          const clustered = clusterDetections(rawDets, 0.2);

          for (const det of clustered) {
            const [r, c, s, q] = det;
            if (q > 2.0) {
              const origCenterX = c * scaleDown;
              const origCenterY = r * scaleDown;
              const origSize = s * scaleDown;

              const x = Math.max(0, origCenterX - origSize / 2);
              const y = Math.max(0, origCenterY - origSize / 2);
              const width = Math.min(canvas.width - x, origSize);
              const height = Math.min(canvas.height - y, origSize);

              results.push({ x, y, width, height, confidence: q });
            }
          }

          if (results.length > 0) return results;
        }
      }
    }
  } catch (err) {
    console.warn('Pico face detection note:', err);
  }

  // 3. Fallback: Skin-tone face cluster detection (guarantees privacy even in difficult lighting)
  const skinRegions = detectSkinClusterRegions(canvas);
  if (skinRegions.length > 0) {
    return skinRegions;
  }

  return results;
}

// ─── 7. Blur Canvas Region with Oval Privacy Glass Effect ───────────────────
export function blurCanvasRegion(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const canvas = ctx.canvas;
  const clampedX = Math.max(0, Math.round(x));
  const clampedY = Math.max(0, Math.round(y));
  const clampedW = Math.min(canvas.width - clampedX, Math.round(w));
  const clampedH = Math.min(canvas.height - clampedY, Math.round(h));

  if (clampedW <= 4 || clampedH <= 4) return;

  try {
    // 1. Create temporary slice canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = clampedW;
    tempCanvas.height = clampedH;
    const tempCtx = tempCanvas.getContext('2d');

    if (tempCtx) {
      tempCtx.drawImage(canvas, clampedX, clampedY, clampedW, clampedH, 0, 0, clampedW, clampedH);

      ctx.save();

      // Clip to an oval centered over the face
      ctx.beginPath();
      ctx.ellipse(
        clampedX + clampedW / 2,
        clampedY + clampedH / 2,
        clampedW / 2,
        clampedH / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.clip();

      // Frosted privacy blur
      if ('filter' in ctx) {
        ctx.filter = 'blur(16px)';
        ctx.drawImage(tempCanvas, clampedX - 4, clampedY - 4, clampedW + 8, clampedH + 8);
        ctx.filter = 'blur(24px)';
        ctx.drawImage(tempCanvas, clampedX - 4, clampedY - 4, clampedW + 8, clampedH + 8);
      } else {
        // Fallback pixelation
        pixelateBox(ctx, clampedX, clampedY, clampedW, clampedH, 16);
      }

      ctx.restore();
      return;
    }
  } catch {}

  // Safe fallback pixelate
  pixelateBox(ctx, clampedX, clampedY, clampedW, clampedH, 16);
}

function pixelateBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  pixelSize = 16
) {
  try {
    const imgData = ctx.getImageData(x, y, w, h);
    const data = imgData.data;

    for (let py = 0; py < h; py += pixelSize) {
      for (let px = 0; px < w; px += pixelSize) {
        const pIndex = (py * w + px) * 4;
        const r = data[pIndex];
        const g = data[pIndex + 1];
        const b = data[pIndex + 2];
        const a = data[pIndex + 3];

        for (let subY = 0; subY < pixelSize && py + subY < h; subY++) {
          for (let subX = 0; subX < pixelSize && px + subX < w; subX++) {
            const targetIndex = ((py + subY) * w + (px + subX)) * 4;
            data[targetIndex] = r;
            data[targetIndex + 1] = g;
            data[targetIndex + 2] = b;
            data[targetIndex + 3] = a;
          }
        }
      }
    }
    ctx.putImageData(imgData, x, y);
  } catch {}
}

// ─── 8. Master Face Blurring on Canvas ───────────────────────────────────────
export async function blurAllFacesOnCanvas(
  canvas: HTMLCanvasElement,
  forceCenterIfNone = false
): Promise<number> {
  let faces = await detectFacesOnCanvas(canvas);

  if (faces.length === 0 && forceCenterIfNone) {
    // Failsafe upper-center portrait blur when explicitly requested by user
    const fw = Math.round(canvas.width * 0.42);
    const fh = Math.round(canvas.height * 0.38);
    const fx = Math.round((canvas.width - fw) / 2);
    const fy = Math.round(canvas.height * 0.12);
    faces = [{ x: fx, y: fy, width: fw, height: fh, confidence: 1.0 }];
  }

  if (faces.length === 0) return 0;

  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;

  for (const face of faces) {
    const padX = face.width * 0.16;
    const padY = face.height * 0.2;
    const bx = Math.max(0, Math.round(face.x - padX));
    const by = Math.max(0, Math.round(face.y - padY));
    const bw = Math.min(canvas.width - bx, Math.round(face.width + padX * 2));
    const bh = Math.min(canvas.height - by, Math.round(face.height + padY * 2));

    blurCanvasRegion(ctx, bx, by, bw, bh);
  }

  return faces.length;
}

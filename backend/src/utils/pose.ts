import sharp from 'sharp';

export type NormalizedPoint = { x: number; y: number };

export type NormalizedBoxLike = {
  left: number;
  top: number;
  width: number;
  height: number;
  imageWidth: number;
  imageHeight: number;
};

export type BodyPose = {
  leftShoulder: NormalizedPoint;
  rightShoulder: NormalizedPoint;
  leftHip: NormalizedPoint;
  rightHip: NormalizedPoint;
  leftAnkle: NormalizedPoint;
  rightAnkle: NormalizedPoint;
  // Rotation of torso vs. upright. Positive means leaning to the right (clockwise).
  torsoAngleDeg: number;
};

type PixelBox = { minX: number; minY: number; maxX: number; maxY: number };

const ALPHA_THRESHOLD = 12;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function safeNormalizedPoint(
  xPx: number,
  yPx: number,
  w: number,
  h: number,
): NormalizedPoint {
  return { x: clamp(xPx / w, 0, 1), y: clamp(yPx / h, 0, 1) };
}

function scanRow(
  data: Buffer,
  width: number,
  channels: number,
  y: number,
  x0: number,
  x1: number,
  stepX: number,
): { found: boolean; minX: number; maxX: number } {
  let minX = x1;
  let maxX = x0;
  let found = false;
  for (let x = x0; x <= x1; x += stepX) {
    const idx = (y * width + x) * channels;
    const alpha = data[idx + 3];
    if (alpha > ALPHA_THRESHOLD) {
      found = true;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
    }
  }
  return { found, minX, maxX };
}

function chooseRowByMaxWidth(
  data: Buffer,
  width: number,
  channels: number,
  box: PixelBox,
  yStart: number,
  yEnd: number,
): number | undefined {
  const ys = clamp(Math.round(yStart), box.minY, box.maxY);
  const ye = clamp(Math.round(yEnd), box.minY, box.maxY);
  if (ye <= ys) return undefined;

  let bestY: number | undefined;
  let bestWidth = -1;

  for (let y = ys; y <= ye; y += 2) {
    const row = scanRow(data, width, channels, y, box.minX, box.maxX, 4);
    if (!row.found) continue;
    const rowWidth = row.maxX - row.minX;
    if (rowWidth > bestWidth) {
      bestWidth = rowWidth;
      bestY = y;
    }
  }

  return bestY;
}

function toPixelBox(
  bodyBox: NormalizedBoxLike,
  imageWidth: number,
  imageHeight: number,
): PixelBox {
  const minX = clamp(Math.round(bodyBox.left * imageWidth), 0, imageWidth - 1);
  const minY = clamp(Math.round(bodyBox.top * imageHeight), 0, imageHeight - 1);
  const maxX = clamp(
    Math.round((bodyBox.left + bodyBox.width) * imageWidth),
    0,
    imageWidth - 1,
  );
  const maxY = clamp(
    Math.round((bodyBox.top + bodyBox.height) * imageHeight),
    0,
    imageHeight - 1,
  );
  return { minX, minY, maxX, maxY };
}

/**
 * MVP pose inference from the alpha silhouette (post background-removal).
 *
 * This is intentionally lightweight (no ML model): it estimates shoulder/hip/ankle
 * lines by finding the widest alpha rows in bands of the body bounding box.
 */
export async function inferBodyPoseFromAlphaPng(
  imageBuffer: Buffer,
  bodyBox?: NormalizedBoxLike,
): Promise<BodyPose | undefined> {
  const image = sharp(imageBuffer).ensureAlpha();
  const meta = await image.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) return undefined;

  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  if (channels < 4) return undefined;

  const fallbackBox: NormalizedBoxLike = bodyBox ?? {
    left: 0.2,
    top: 0.06,
    width: 0.6,
    height: 0.88,
    imageWidth: w,
    imageHeight: h,
  };
  const box = toPixelBox(fallbackBox, w, h);
  const boxH = Math.max(1, box.maxY - box.minY);

  // Bands as percentages of the body bounding box height.
  const shoulderY = chooseRowByMaxWidth(
    data,
    w,
    channels,
    box,
    box.minY + boxH * 0.14,
    box.minY + boxH * 0.3,
  );
  const hipY = chooseRowByMaxWidth(
    data,
    w,
    channels,
    box,
    box.minY + boxH * 0.44,
    box.minY + boxH * 0.64,
  );
  const ankleY = chooseRowByMaxWidth(
    data,
    w,
    channels,
    box,
    box.minY + boxH * 0.86,
    box.minY + boxH * 0.98,
  );

  if (shoulderY == null || hipY == null || ankleY == null) {
    return undefined;
  }

  // Fine scan on selected rows.
  const s = scanRow(data, w, channels, shoulderY, box.minX, box.maxX, 1);
  const hip = scanRow(data, w, channels, hipY, box.minX, box.maxX, 1);
  const a = scanRow(data, w, channels, ankleY, box.minX, box.maxX, 1);

  if (!s.found || !hip.found || !a.found) return undefined;

  const shoulderMidX = (s.minX + s.maxX) / 2;
  const hipMidX = (hip.minX + hip.maxX) / 2;
  const shoulderMidY = shoulderY;
  const hipMidY = hipY;

  const dx = hipMidX - shoulderMidX;
  const dy = hipMidY - shoulderMidY;
  const angleRad = Math.atan2(dy, dx); // vs +x
  const torsoAngleDeg = clamp(
    ((angleRad - Math.PI / 2) * 180) / Math.PI,
    -28,
    28,
  );

  return {
    leftShoulder: safeNormalizedPoint(s.minX, shoulderY, w, h),
    rightShoulder: safeNormalizedPoint(s.maxX, shoulderY, w, h),
    leftHip: safeNormalizedPoint(hip.minX, hipY, w, h),
    rightHip: safeNormalizedPoint(hip.maxX, hipY, w, h),
    leftAnkle: safeNormalizedPoint(a.minX, ankleY, w, h),
    rightAnkle: safeNormalizedPoint(a.maxX, ankleY, w, h),
    torsoAngleDeg,
  };
}

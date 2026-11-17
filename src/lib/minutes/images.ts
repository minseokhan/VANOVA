export type ImageInfo = { type: "png" | "jpeg"; width: number; height: number };

const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EMU_PER_PX = 9525;

/** PNG·JPEG 헤더에서 형식과 픽셀 크기를 읽는다. 다른 형식이거나 잘렸으면 null */
export function imageInfo(buf: Buffer): ImageInfo | null {
  if (buf.length >= 24 && PNG_SIG.every((b, i) => buf[i] === b) && buf.toString("ascii", 12, 16) === "IHDR") {
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return width && height ? { type: "png", width, height } : null;
  }
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  // JPEG: 세그먼트를 따라가다 SOF(C0~CF, 단 C4·C8·CC 제외)에서 크기를 읽는다
  let i = 2;
  while (i + 9 <= buf.length) {
    if (buf[i] !== 0xff) return null;
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return width && height ? { type: "jpeg", width, height } : null;
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return null;
}

/** 픽셀 → EMU. 가로·세로 모두 max 이하로 비율을 지켜 줄인다 */
export function fitEmu(width: number, height: number, max: number): { cx: number; cy: number } {
  const scale = Math.min(1, max / (width * EMU_PER_PX), max / (height * EMU_PER_PX));
  return { cx: Math.round(width * EMU_PER_PX * scale), cy: Math.round(height * EMU_PER_PX * scale) };
}

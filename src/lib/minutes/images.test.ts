import { describe, expect, it } from "vitest";
import { fitEmu, imageInfo } from "./images";

/** PNG 시그니처 + IHDR(가로·세로)만 있는 헤더 */
function pngHeader(w: number, h: number): Buffer {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return b;
}

/** SOI + APP0 + SOF2(프로그레시브) */
function jpegHeader(w: number, h: number): Buffer {
  const app0 = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
  const sof = [0xff, 0xc2, 0x00, 0x0b, 0x08, h >> 8, h & 0xff, w >> 8, w & 0xff, 0x01, 0x00, 0x00, 0x00];
  return Buffer.from([0xff, 0xd8, ...app0, ...sof]);
}

describe("imageInfo", () => {
  it("PNG 가로·세로", () => {
    expect(imageInfo(pngHeader(800, 600))).toEqual({ type: "png", width: 800, height: 600 });
  });
  it("JPEG는 앞 세그먼트를 건너뛰고 SOF에서 읽는다", () => {
    expect(imageInfo(jpegHeader(1024, 768))).toEqual({ type: "jpeg", width: 1024, height: 768 });
  });
  it("이미지가 아니거나 잘린 파일은 null", () => {
    expect(imageInfo(Buffer.from("not an image"))).toBeNull();
    expect(imageInfo(jpegHeader(10, 10).subarray(0, 8))).toBeNull();
    expect(imageInfo(pngHeader(0, 10))).toBeNull();
  });
});

describe("fitEmu", () => {
  it("비율을 지키며 최대 크기 안으로 줄인다 (1px = 9525 EMU)", () => {
    expect(fitEmu(100, 50, 3_240_000)).toEqual({ cx: 952_500, cy: 476_250 });
    expect(fitEmu(4000, 2000, 3_240_000)).toEqual({ cx: 3_240_000, cy: 1_620_000 });
    expect(fitEmu(1000, 4000, 3_240_000)).toEqual({ cx: 810_000, cy: 3_240_000 });
  });
});

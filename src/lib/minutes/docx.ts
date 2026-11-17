import path from "node:path";
import JSZip from "jszip";
import type { MinutesDoc } from "./compose";
import { fitEmu, imageInfo, type ImageInfo } from "./images";

/** 회의록 양식(구글 독스 원본에서 임베드 폰트만 뺀 사본). {{이름}} 자리표시자가 들어 있다 */
export const TEMPLATE_PATH = path.join(process.cwd(), "src/lib/minutes/minutes-template.docx");

function escapeText(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .join('</w:t><w:br/><w:t xml:space="preserve">');
}

function fillVars(xml: string, vars: Record<string, string>): string {
  return xml.replace(/\{\{(\w+)\}\}/g, (m, k: string) => (k in vars ? escapeText(vars[k]) : m));
}

/**
 * {{키}}를 채운다. repeats 의 키는 반복할 표 행 안의 자리표시자 이름이고,
 * 그 행(<w:tr>)을 항목 수만큼 복제해 각 항목의 값으로 채운다.
 */
export function fillXml(xml: string, vars: Record<string, string>, repeats: Record<string, Record<string, string>[]>): string {
  let out = xml;
  for (const [key, items] of Object.entries(repeats)) {
    const at = out.indexOf(`{{${key}}}`);
    if (at < 0) throw new Error(`양식에 {{${key}}} 행이 없습니다`);
    const start = out.lastIndexOf("<w:tr>", at);
    const end = out.indexOf("</w:tr>", at) + "</w:tr>".length;
    const row = out.slice(start, end);
    out = out.slice(0, start) + items.map((it) => fillVars(row, it)).join("") + out.slice(end);
  }
  return fillVars(out, vars);
}

/** 진행 상황 칸의 사진 최대 가로·세로 (9cm) */
const MAX_IMAGE_EMU = 3_240_000;
const IMAGE_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image";
const marker = (n: number) => `⟦IMG${n}⟧`;

function drawingRun(n: number, info: ImageInfo): string {
  const { cx, cy } = fitEmu(info.width, info.height, MAX_IMAGE_EMU);
  const id = 9000 + n;
  return (
    `<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/>` +
    `<wp:docPr id="${id}" name="첨부 사진 ${n}"/><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
    `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="첨부 사진 ${n}"/><pic:cNvPicPr/></pic:nvPicPr>` +
    `<pic:blipFill><a:blip r:embed="rIdVanovaImg${n}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
    `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
    `</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`
  );
}

/**
 * images 는 사진 URL → 내려받은 바이트. 진행 상황 칸 글 끝에 자리표시 문자를 넣어 채운 뒤
 * 그 자리에서 텍스트 run 을 끊고 이미지 run 을 끼운다. 못 받았거나 PNG·JPEG 가 아니면 링크 줄로 남긴다.
 */
export async function renderMinutesDocx(template: Buffer, doc: MinutesDoc, images: Map<string, Buffer> = new Map()): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const xml = await zip.file("word/document.xml")!.async("string");

  const embedded: { n: number; info: ImageInfo; buf: Buffer }[] = [];
  const progress = doc.progress.map(({ project, progress: text, images: photos }) => {
    let out = text;
    for (const { title, url } of photos) {
      const buf = images.get(url);
      const info = buf && imageInfo(buf);
      if (buf && info) {
        embedded.push({ n: embedded.length + 1, info, buf });
        out += `\n${marker(embedded.length)}`;
      } else {
        out += `\n- ${title}: ${url}`;
      }
    }
    return { project, progress: out };
  });

  let filled = fillXml(xml, doc.vars, {
    decisionText: doc.decisions,
    progress,
    followUp: doc.followUp,
    requirement: doc.requirement,
  });

  if (embedded.length) {
    for (const { n, info, buf } of embedded) {
      filled = filled.replace(marker(n), `</w:t></w:r>${drawingRun(n, info)}<w:r><w:t xml:space="preserve">`);
      zip.file(`word/media/vanova-img-${n}.${info.type}`, buf);
    }
    const relsPath = "word/_rels/document.xml.rels";
    const rels = await zip.file(relsPath)!.async("string");
    const added = embedded
      .map(({ n, info }) => `<Relationship Id="rIdVanovaImg${n}" Type="${IMAGE_REL}" Target="media/vanova-img-${n}.${info.type}"/>`)
      .join("");
    zip.file(relsPath, rels.replace("</Relationships>", `${added}</Relationships>`));

    const typesPath = "[Content_Types].xml";
    let types = await zip.file(typesPath)!.async("string");
    for (const ext of ["png", "jpeg"] as const) {
      if (embedded.some((e) => e.info.type === ext) && !types.includes(`Extension="${ext}"`)) {
        types = types.replace(/(<Types[^>]*>)/, `$1<Default Extension="${ext}" ContentType="image/${ext}"/>`);
      }
    }
    zip.file(typesPath, types);
  }

  zip.file("word/document.xml", filled);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

import path from "node:path";
import JSZip from "jszip";
import type { MinutesDoc } from "./compose";

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

export async function renderMinutesDocx(template: Buffer, doc: MinutesDoc): Promise<Buffer> {
  const zip = await JSZip.loadAsync(template);
  const xml = await zip.file("word/document.xml")!.async("string");
  zip.file(
    "word/document.xml",
    fillXml(xml, doc.vars, {
      decisionText: doc.decisions,
      progress: doc.progress,
      followUp: doc.followUp,
      requirement: doc.requirement,
    }),
  );
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

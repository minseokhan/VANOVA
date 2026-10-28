import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { fillXml, renderMinutesDocx, TEMPLATE_PATH } from "./docx";
import type { MinutesDoc } from "./compose";

const row = '<w:tbl><w:tr><w:t>헤더</w:t></w:tr><w:tr><w:t>{{a}}</w:t><w:t>{{b}}</w:t></w:tr></w:tbl>';

describe("fillXml", () => {
  it("변수를 XML 이스케이프해 넣고 줄바꿈은 <w:br/>", () => {
    expect(fillXml("<w:t>{{x}}</w:t>", { x: "A&B <c>\n둘째 줄" }, {})).toBe(
      '<w:t>A&amp;B &lt;c&gt;</w:t><w:br/><w:t xml:space="preserve">둘째 줄</w:t>',
    );
  });

  it("반복 행은 항목 수만큼 복제", () => {
    const out = fillXml(row, {}, { a: [{ a: "1", b: "가" }, { a: "2", b: "나" }] });
    expect(out).toBe(
      "<w:tbl><w:tr><w:t>헤더</w:t></w:tr><w:tr><w:t>1</w:t><w:t>가</w:t></w:tr><w:tr><w:t>2</w:t><w:t>나</w:t></w:tr></w:tbl>",
    );
  });

  it("$ 같은 치환 패턴 문자도 그대로", () => {
    expect(fillXml("<w:t>{{x}}</w:t>", { x: "$& $1" }, {})).toBe("<w:t>$&amp; $1</w:t>");
  });
});

const doc: MinutesDoc = {
  title: "10월 4주차 주간 회의 보고",
  fileName: "2026-10-26_VAN_개발회의_회의록.docx",
  vars: {
    datetime: "2026년 10월 26일(월) 22:00",
    criteria: "2-4 프로젝트 진행 상황 공유",
    nextMeetingLine: "2026년 11월 02일(월) 22:00, 동일 Discord 라운지 채널",
    nextMeetingDate: "2026년 11월 02일(월) 22:00",
    keyConclusion: "핵심 결론 문장",
    attendCount: "2",
    attendees: "박동진, 남유리",
    absentCount: "0",
    absentees: "없음",
    remarks: "특이사항 없음",
  },
  decisions: [
    { decisionLabel: "운영", decisionText: "결정 A" },
    { decisionLabel: "4-3", decisionText: "결정 B" },
  ],
  progress: [{ project: "2-4 MLI", progress: "진행 X" }],
  followUp: [{ project: "2-4 MLI", followUp: "후속 Y" }],
  requirement: [{ project: "2-4 MLI", requirement: "없음" }],
};

describe("renderMinutesDocx", () => {
  it("실제 양식을 채우면 자리표시자가 남지 않고 결정사항은 2행만", async () => {
    const buf = await renderMinutesDocx(await readFile(TEMPLATE_PATH), doc);
    const xml = await (await JSZip.loadAsync(buf)).file("word/document.xml")!.async("string");
    expect(xml).not.toMatch(/\{\{\w+\}\}/);
    for (const s of ["결정 A", "결정 B", "진행 X", "후속 Y", "박동진, 남유리", "핵심 결론 문장", "2026년 11월 02일(월) 22:00"]) {
      expect(xml).toContain(s);
    }
    expect(xml.split("2-4 MLI").length - 1).toBe(3);
    // 결정사항 표: 헤더 1행 + 결정 2행
    const tables = xml.match(/<w:tbl>[\s\S]*?<\/w:tbl>/g)!;
    expect(tables[3].match(/<w:tr>/g)).toHaveLength(3);
    // 값은 프로젝트명 칸이 아니라 두 번째 칸에 들어간다
    const cells = (t: string) => t.match(/<w:tc>[\s\S]*?<\/w:tc>/g)!;
    const [, , , , progress, followUp] = tables;
    expect(cells(progress)[2]).toContain("2-4 MLI");
    expect(cells(progress)[2]).not.toContain("진행 X");
    expect(cells(progress)[3]).toContain("진행 X");
    expect(cells(followUp)[3]).toContain("후속 Y");
    expect(cells(tables[3])[2]).toContain("운영");
    expect(cells(tables[3])[3]).toContain("결정 A");
  });
});

import { describe, expect, it } from "vitest";
import {
  assembleMinutes,
  buildMinutesPrompt,
  defaultMeetingDate,
  finalizeMinutes,
  type MinutesDraft,
  minutesOutputSchema,
  parseRoster,
  resolveAttendance,
  validateGenerateInput,
  MAX_NOTES,
  type MinutesContext,
  type MinutesLlmOutput,
} from "./compose";

const ctx: MinutesContext = {
  date: "2026-10-26",
  notes: "4-3은 팀원 목록 업데이트 요청.",
  attendance: [
    { name: "박동진", status: "PRESENT", reason: null },
    { name: "남유리", status: "PRESENT", reason: null },
    { name: "성정헌", status: "EXCUSED", reason: "학교 팀플" },
    { name: "한민석", status: "ABSENT", reason: null },
  ],
  projects: [
    { code: "2-4", title: "MLI 한국지부 홈페이지 전면 개편", report: null },
    {
      code: "4-3",
      title: "AI 기사 제작·발행 시스템",
      report: {
        author: "남유리",
        didThisWeek: "역할 분배",
        planNextWeek: "본격 개발",
        issues: "팀원 업데이트 필요",
        attachments: [
          { kind: "FILE", title: "메인 시안", url: "https://x.public.blob.vercel-storage.com/weekly/p/main-abc.png" },
          { kind: "LINK", title: "피그마", url: "https://figma.com/file/1" },
          { kind: "FILE", title: "기획서", url: "https://x.public.blob.vercel-storage.com/weekly/p/plan-abc.pdf" },
        ],
      },
    },
  ],
};

const llm: MinutesLlmOutput = {
  startTime: "22:00",
  endTime: "22:40",
  keyConclusion: "주요 프로젝트 3건의 진행 상황을 점검함.",
  remarks: "성정헌은 학교 팀플로 인해 불참함.\n한민석은 사전 연락 없이 불참함.",
  decisions: [
    { label: "운영", text: "대시보드 팀원 정보 갱신" },
    { label: "4-3", text: "주 1이슈 진행" },
  ],
  projects: [{ code: "4-3", progress: "역할 분배 완료", followUp: "본격 개발 착수", requirement: "팀원 목록 업데이트" }],
};

describe("defaultMeetingDate", () => {
  it("요청한 날이 속한 주의 월요일 (KST)", () => {
    expect(defaultMeetingDate(new Date("2026-10-27T03:00:00Z"))).toBe("2026-10-26"); // 화
    expect(defaultMeetingDate(new Date("2026-10-26T13:00:00Z"))).toBe("2026-10-26"); // 월 22시
    expect(defaultMeetingDate(new Date("2026-11-01T10:00:00Z"))).toBe("2026-10-26"); // 일
  });
});

describe("parseRoster", () => {
  it("쉼표·줄바꿈으로 나누고 공백·중복 제거", () => {
    expect(parseRoster(" 박동진, 남유리\n한민석,,박동진 ")).toEqual(["박동진", "남유리", "한민석"]);
  });
});

describe("buildMinutesPrompt", () => {
  it("첨부는 종류와 제목만 넘기고 URL은 넘기지 않는다", () => {
    const { system, user } = buildMinutesPrompt(ctx);
    expect(user).toContain("[첨부]\n- 사진: 메인 시안\n- 링크: 피그마\n- 파일: 기획서");
    expect(user).not.toContain("blob.vercel-storage.com");
    expect(user).not.toContain("figma.com");
    expect(system).toContain("URL");
  });

  it("출석 기록·주간 보고·자유 메모를 모두 담고 미제출을 표시", () => {
    const { system, user } = buildMinutesPrompt(ctx);
    expect(system).toContain("회의록");
    expect(user).toContain("- 출석: 박동진, 남유리");
    expect(user).toContain("- 인정 불참: 성정헌 (사유: 학교 팀플)");
    expect(user).toContain("- 불참: 한민석");
    expect(user).toContain("역할 분배");
    expect(user).toContain("팀원 업데이트 필요");
    expect(user).toContain("2-4 MLI 한국지부 홈페이지 전면 개편");
    expect(user).toContain("주간 보고 미제출");
    expect(user).toContain(ctx.notes);
  });
});

describe("minutesOutputSchema", () => {
  it("프로젝트 코드는 enum으로 제한하고, 불참자는 출석 기록으로 정하므로 받지 않는다", () => {
    const s = JSON.stringify(minutesOutputSchema(ctx));
    expect(s).not.toContain("absentees");
    expect(s).toContain('"enum":["2-4","4-3"]');
  });
});

describe("assembleMinutes", () => {
  const build = (o: MinutesLlmOutput) => finalizeMinutes(assembleMinutes(ctx, o));
  const doc = build(llm);

  it("제목·파일명은 회의 날짜 기준", () => {
    expect(doc.title).toBe("10월 4주차 주간 회의 보고");
    expect(doc.fileName).toBe("2026-10-26_VAN_개발회의_회의록");
  });

  it("일시·다음 회의는 날짜에서 계산", () => {
    expect(doc.vars.datetime).toBe("2026년 10월 26일(월) 22:00~22:40 (총 40분)");
    expect(doc.vars.nextMeetingDate).toBe("2026년 11월 02일(월) 22:00");
    expect(doc.vars.nextMeetingLine).toBe("2026년 11월 02일(월) 22:00, 동일 Discord 라운지 채널");
    expect(doc.vars.criteria).toBe("2-4, 4-3 프로젝트 진행 상황 공유 및 피드백, 프로젝트별 후속 액션 계획 선정");
  });

  it("참석·불참은 출석 기록에서 (인정 불참·불참 모두 불참)", () => {
    expect(doc.vars.attendees).toBe("박동진, 남유리");
    expect(doc.vars.attendCount).toBe("2");
    expect(doc.vars.absentees).toBe("성정헌, 한민석");
    expect(doc.vars.absentCount).toBe("2");
  });

  it("결정사항은 있는 만큼만 행을 만든다", () => {
    expect(doc.decisions).toEqual([
      { decisionLabel: "운영", decisionText: "대시보드 팀원 정보 갱신" },
      { decisionLabel: "4-3", decisionText: "주 1이슈 진행" },
    ]);
  });

  it("프로젝트 행은 주요 프로젝트 순서대로, LLM이 빠뜨린 칸은 없음", () => {
    expect(doc.progress).toEqual([
      { project: "2-4 MLI 한국지부 홈페이지 전면 개편", progress: "없음", images: [] },
      {
        project: "4-3 AI 기사 제작·발행 시스템",
        // 사진은 이미지로 따로 넣고, 링크·파일은 URL을 시스템이 그대로 붙인다
        progress:
          "역할 분배 완료\n\n[첨부]\n- 피그마: https://figma.com/file/1\n- 기획서: https://x.public.blob.vercel-storage.com/weekly/p/plan-abc.pdf",
        images: [{ title: "메인 시안", url: "https://x.public.blob.vercel-storage.com/weekly/p/main-abc.png" }],
      },
    ]);
    expect(doc.requirement[0].requirement).toBe("없음");
    expect(doc.followUp[1].followUp).toBe("본격 개발 착수");
  });

  it("종료 시각이 없거나 형식이 틀리면 시작 시각만, 시작이 틀리면 22:00", () => {
    expect(build({ ...llm, endTime: null }).vars.datetime).toBe("2026년 10월 26일(월) 22:00");
    expect(build({ ...llm, startTime: "밤 10시", endTime: "x" }).vars.datetime).toBe(
      "2026년 10월 26일(월) 22:00",
    );
  });

  it("불참·결정사항이 없을 때의 기본 문구", () => {
    const all = ctx.attendance.map((a) => ({ ...a, status: "PRESENT" as const, reason: null }));
    const d = finalizeMinutes(assembleMinutes({ ...ctx, attendance: all }, { ...llm, remarks: " ", decisions: [] }));
    expect(d.vars.absentees).toBe("없음");
    expect(d.vars.absentCount).toBe("0");
    expect(d.vars.attendCount).toBe("4");
    expect(d.vars.remarks).toBe("특이사항 없음");
    expect(d.decisions).toEqual([{ decisionLabel: "-", decisionText: "없음" }]);
  });

});

describe("resolveAttendance", () => {
  const members = [
    { id: "a", name: "박동진" },
    { id: "b", name: "남유리" },
  ];
  it("부원 순서대로 그 주 상태·사유를 붙인다", () => {
    expect(
      resolveAttendance(members, [
        { userId: "b", status: "EXCUSED", reason: "시험" },
        { userId: "a", status: "PRESENT", reason: null },
        { userId: "z", status: "ABSENT", reason: null },
      ]),
    ).toEqual({
      ok: true,
      value: [
        { name: "박동진", status: "PRESENT", reason: null },
        { name: "남유리", status: "EXCUSED", reason: "시험" },
      ],
    });
  });

  it("체크 안 된 부원이 있으면 이름을 알려준다", () => {
    const r = resolveAttendance(members, [{ userId: "a", status: "PRESENT", reason: null }]);
    expect(r).toEqual({ ok: false, error: expect.stringContaining("남유리") });
  });
});

describe("validateGenerateInput", () => {
  it("정상 입력", () => {
    expect(validateGenerateInput({ date: "2026-10-26", notes: " 메모 " })).toEqual({
      ok: true,
      value: { date: "2026-10-26", notes: "메모" },
    });
  });

  it("날짜·메모 오류", () => {
    const r = validateGenerateInput({ date: "2026-02-30", notes: " " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["date", "notes"]);
    const long = validateGenerateInput({ date: "2026-10-26", notes: "가".repeat(MAX_NOTES + 1) });
    expect(long.ok).toBe(false);
  });
});

const draft: MinutesDraft = {
  date: "2026-10-26",
  datetime: "2026년 10월 26일(월) 22:00",
  criteria: "2-4 프로젝트 진행 상황 공유",
  nextMeetingDate: "2026년 11월 02일(월) 22:00",
  keyConclusion: "결론",
  attendees: "박동진, 남유리, 한민석",
  absentees: "없음",
  remarks: "",
  decisions: [{ label: "운영", text: "결정" }],
  projects: [{ project: "2-4 MLI", progress: "진행", followUp: "", requirement: "없음" }],
};

describe("finalizeMinutes", () => {
  it("수정한 명단으로 인원수를 다시 센다", () => {
    const d = finalizeMinutes({ ...draft, attendees: "박동진, 남유리", absentees: "한민석, 성정헌" });
    expect(d.vars.attendCount).toBe("2");
    expect(d.vars.absentCount).toBe("2");
    expect(finalizeMinutes(draft).vars.absentCount).toBe("0");
  });

  it("빈 칸은 기본 문구, 빈 결정 행은 버린다", () => {
    const d = finalizeMinutes({ ...draft, decisions: [{ label: "", text: " " }] });
    expect(d.vars.remarks).toBe("특이사항 없음");
    expect(d.followUp[0].followUp).toBe("없음");
    expect(d.decisions).toEqual([{ decisionLabel: "-", decisionText: "없음" }]);
    expect(d.vars.nextMeetingLine).toBe("2026년 11월 02일(월) 22:00, 동일 Discord 라운지 채널");
  });
});

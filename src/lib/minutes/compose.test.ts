import { describe, expect, it } from "vitest";
import {
  assembleMinutes,
  buildMinutesPrompt,
  defaultMeetingDate,
  finalizeMinutes,
  type MinutesDraft,
  minutesOutputSchema,
  parseRoster,
  validateGenerateInput,
  MAX_NOTES,
  type MinutesContext,
  type MinutesLlmOutput,
} from "./compose";

const ctx: MinutesContext = {
  date: "2026-10-26",
  notes: "성정헌은 학교 팀플로 불참, 나머지는 다 참여함. 4-3은 팀원 목록 업데이트 요청.",
  roster: ["박동진", "남유리", "성정헌", "한민석"],
  projects: [
    { code: "2-4", title: "MLI 한국지부 홈페이지 전면 개편", report: null },
    {
      code: "4-3",
      title: "AI 기사 제작·발행 시스템",
      report: { author: "남유리", didThisWeek: "역할 분배", planNextWeek: "본격 개발", issues: "팀원 업데이트 필요" },
    },
  ],
};

const llm: MinutesLlmOutput = {
  startTime: "22:00",
  endTime: "22:40",
  keyConclusion: "주요 프로젝트 3건의 진행 상황을 점검함.",
  absentees: [{ name: "성정헌", reason: "학교 팀플" }],
  remarks: "성정헌은 학교 팀플 회의로 인해 불참함.",
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
  it("명단·주간 보고·자유 메모를 모두 담고 미제출을 표시", () => {
    const { system, user } = buildMinutesPrompt(ctx);
    expect(system).toContain("회의록");
    expect(user).toContain("박동진, 남유리, 성정헌, 한민석");
    expect(user).toContain("역할 분배");
    expect(user).toContain("팀원 업데이트 필요");
    expect(user).toContain("2-4 MLI 한국지부 홈페이지 전면 개편");
    expect(user).toContain("주간 보고 미제출");
    expect(user).toContain(ctx.notes);
  });
});

describe("minutesOutputSchema", () => {
  it("불참자 이름과 프로젝트 코드를 enum으로 제한", () => {
    const s = JSON.stringify(minutesOutputSchema(ctx));
    expect(s).toContain('"enum":["박동진","남유리","성정헌","한민석"]');
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

  it("참석 = 명단 - 불참", () => {
    expect(doc.vars.attendees).toBe("박동진, 남유리, 한민석");
    expect(doc.vars.attendCount).toBe("3");
    expect(doc.vars.absentees).toBe("성정헌");
    expect(doc.vars.absentCount).toBe("1");
  });

  it("결정사항은 있는 만큼만 행을 만든다", () => {
    expect(doc.decisions).toEqual([
      { decisionLabel: "운영", decisionText: "대시보드 팀원 정보 갱신" },
      { decisionLabel: "4-3", decisionText: "주 1이슈 진행" },
    ]);
  });

  it("프로젝트 행은 주요 프로젝트 순서대로, LLM이 빠뜨린 칸은 없음", () => {
    expect(doc.progress).toEqual([
      { project: "2-4 MLI 한국지부 홈페이지 전면 개편", progress: "없음" },
      { project: "4-3 AI 기사 제작·발행 시스템", progress: "역할 분배 완료" },
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
    const d = build({ ...llm, absentees: [], remarks: " ", decisions: [] });
    expect(d.vars.absentees).toBe("없음");
    expect(d.vars.absentCount).toBe("0");
    expect(d.vars.attendCount).toBe("4");
    expect(d.vars.remarks).toBe("특이사항 없음");
    expect(d.decisions).toEqual([{ decisionLabel: "-", decisionText: "없음" }]);
  });

  it("명단에 없는 불참자 이름은 무시", () => {
    const d = build({ ...llm, absentees: [{ name: "외부인", reason: "?" }] });
    expect(d.vars.absentCount).toBe("0");
  });
});

describe("validateGenerateInput", () => {
  it("정상 입력", () => {
    expect(validateGenerateInput({ date: "2026-10-26", notes: " 메모 ", roster: "박동진, 남유리" })).toEqual({
      ok: true,
      value: { date: "2026-10-26", notes: "메모", roster: ["박동진", "남유리"] },
    });
  });

  it("날짜·메모·명단 오류", () => {
    const r = validateGenerateInput({ date: "2026-02-30", notes: " ", roster: " , " });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["date", "notes", "roster"]);
    const long = validateGenerateInput({ date: "2026-10-26", notes: "가".repeat(MAX_NOTES + 1), roster: "a" });
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

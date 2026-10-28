import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MINUTES_FOLDER_ID, uploadAsGoogleDoc } from "./drive";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("GOOGLE_CLIENT_ID", "cid");
  vi.stubEnv("GOOGLE_CLIENT_SECRET", "secret");
  vi.stubEnv("GOOGLE_REFRESH_TOKEN", "refresh");
  fetchMock
    .mockReset()
    .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" })))
    .mockResolvedValueOnce(new Response(JSON.stringify({ id: "f1", webViewLink: "https://drive.google.com/file/d/f1/view" })));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("uploadAsGoogleDoc", () => {
  it("리프레시 토큰으로 액세스 토큰을 받아 회의록 폴더에 구글 독스로 변환 업로드하고 링크를 돌려준다", async () => {
    const link = await uploadAsGoogleDoc("회의록", Buffer.from("DOCX"));
    expect(link).toBe("https://drive.google.com/file/d/f1/view");

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(tokenUrl).toBe("https://oauth2.googleapis.com/token");
    expect(String(tokenInit.body)).toContain("grant_type=refresh_token");
    expect(String(tokenInit.body)).toContain("refresh_token=refresh");

    const [uploadUrl, uploadInit] = fetchMock.mock.calls[1];
    expect(uploadUrl).toContain("uploadType=multipart");
    expect(uploadInit.headers.Authorization).toBe("Bearer tok");
    const body = Buffer.from(uploadInit.body).toString();
    expect(body).toContain(`"parents":["${MINUTES_FOLDER_ID}"]`);
    expect(body).toContain('"name":"회의록"');
    expect(body).toContain('"mimeType":"application/vnd.google-apps.document"');
    expect(body).toContain("DOCX");
  });

  it("환경변수가 없으면 설정 안내 에러", async () => {
    vi.stubEnv("GOOGLE_REFRESH_TOKEN", "");
    await expect(uploadAsGoogleDoc("a.docx", Buffer.from(""))).rejects.toThrow(/GOOGLE_REFRESH_TOKEN/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("업로드 실패 시 상태코드를 담아 throw", async () => {
    fetchMock
      .mockReset()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "tok" })))
      .mockResolvedValueOnce(new Response("denied", { status: 403 }));
    await expect(uploadAsGoogleDoc("a.docx", Buffer.from(""))).rejects.toThrow(/403/);
  });
});

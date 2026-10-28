/** 회의록 저장 폴더 (VAN AI 혁신부 공유 드라이브 폴더) */
export const MINUTES_FOLDER_ID = "1uqSGe7eLYzadBBefU-gqwuu7dR617xoH";

const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const GOOGLE_DOC = "application/vnd.google-apps.document";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} 환경변수가 설정되지 않았습니다`);
  return v;
}

async function accessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: env("GOOGLE_CLIENT_ID"),
    client_secret: env("GOOGLE_CLIENT_SECRET"),
    refresh_token: env("GOOGLE_REFRESH_TOKEN"),
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", { method: "POST", body });
  if (!res.ok) throw new Error(`구글 인증 실패 (${res.status})`);
  return (await res.json()).access_token;
}

/**
 * docx 를 구글 독스로 변환해 회의록 폴더에 올리고 웹 링크를 돌려준다.
 * 폴더 소유자 계정의 OAuth 리프레시 토큰을 쓴다 (서비스 계정은 개인 드라이브 저장 용량이 없다).
 */
export async function uploadAsGoogleDoc(name: string, file: Buffer): Promise<string> {
  const token = await accessToken();
  const boundary = `vanova-${Date.now()}`;
  const meta = JSON.stringify({ name, parents: [MINUTES_FOLDER_ID], mimeType: GOOGLE_DOC });
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${DOCX}\r\n\r\n`),
    file,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body,
    },
  );
  if (!res.ok) throw new Error(`구글 드라이브 업로드 실패 (${res.status})`);
  return (await res.json()).webViewLink;
}

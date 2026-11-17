import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "@/lib/auth/guards";
import { canEditProject } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { safeFileName, validateUploadFile } from "@/lib/plan-docs/validation";
import type { SessionUser } from "@/lib/auth/session";

export async function POST(req: Request) {
  const fd = await req.formData();
  const file = fd.get("file");
  const projectId = String(fd.get("projectId") ?? "");
  const isReceipt = fd.get("kind") === "receipt";
  const isWeekly = fd.get("kind") === "weekly";

  // weekly 는 주간 보고 첨부(프로젝트 편집 권한), 그 외 projectId가 있으면 기획안(운영진 전용), 없으면 본인 포트폴리오·영수증
  let user: SessionUser;
  try {
    user = projectId && !isWeekly ? await requireAdmin() : await requireUser();
  } catch (e) {
    if (e instanceof Error && e.message === "FORBIDDEN") return NextResponse.json({ error: "운영진만 업로드할 수 있습니다" }, { status: 403 });
    if (typeof (e as { digest?: string }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }
    throw e;
  }
  // Vercel Blob 은 BLOB_READ_WRITE_TOKEN 또는 VERCEL_OIDC_TOKEN+BLOB_STORE_ID 로 인증한다.
  // 최근 생성한 스토어는 토큰을 주입하지 않고 OIDC 만 쓰므로 둘 다 없을 때만 미설정으로 본다
  if (isWeekly) {
    const members = await db.projectMember.findMany({ where: { projectId }, select: { userId: true } });
    if (!projectId || !canEditProject(user, members.map((m) => m.userId))) {
      return NextResponse.json({ error: "프로젝트 멤버만 업로드할 수 있습니다" }, { status: 403 });
    }
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return NextResponse.json({ error: "파일 저장소가 설정되지 않았습니다. 링크로 등록해 주세요." }, { status: 503 });
  }
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 필요합니다" }, { status: 400 });
  const error = validateUploadFile(file.name, file.size);
  if (error) return NextResponse.json({ error }, { status: 400 });
  const name = safeFileName(file.name);
  const path = isWeekly
    ? `weekly/${projectId}/${name}`
    : projectId
      ? `plan-docs/${projectId}/${name}`
      : `${isReceipt ? "receipts" : "profiles"}/${user.id}/${name}`;
  try {
    const { url } = await put(path, file, { access: "public", addRandomSuffix: true });
    return NextResponse.json({ url, name });
  } catch (e) {
    // put() 실패를 그대로 던지면 500 HTML 이 돌아가 클라이언트가 이유를 못 읽는다
    console.error("blob put failed", e);
    const reason = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: `파일 저장소 오류: ${reason}` }, { status: 502 });
  }
}

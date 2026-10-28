"use client";

import { useEffect } from "react";
import { markNoticesSeen } from "@/app/(dashboard)/notices/actions";

/** 렌더 중엔 DB를 바꿀 수 없어서, 페이지가 열린 뒤 액션으로 확인 시각을 남긴다 */
export function MarkNoticesSeen() {
  useEffect(() => {
    markNoticesSeen();
  }, []);
  return null;
}

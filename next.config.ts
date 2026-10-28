import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop 훅 검증 빌드는 NEXT_DIST_DIR=.next-check 로 실행해 dev 서버의 .next 를 덮어쓰지 않는다
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // 회의록 생성 Server Action 이 런타임에 읽는 docx 양식을 서버리스 번들에 포함
  outputFileTracingIncludes: { "/minutes": ["./src/lib/minutes/minutes-template.docx"] },
};

export default nextConfig;

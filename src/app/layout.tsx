import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VANOVA",
  description: "VAN AI 혁신부 프로젝트 배치·진행·주간 보고 관리",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}

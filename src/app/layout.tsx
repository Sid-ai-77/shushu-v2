import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shushu v2 · 바이브코딩 자동 검수",
  description: "Cursor·v0·Lovable·Claude Code로 만든 사이트를 슈슈가 자동 검수하고 AUTO·PROPOSE·HUMAN ONLY 라벨링합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

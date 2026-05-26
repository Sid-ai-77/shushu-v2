// Ingest 도메인 — screenshot
// Cloudflare Browser Rendering REST API로 데스크탑·모바일 캡처 + R2 저장
// (Cloudflare Pages는 Browser binding 직접 미지원이라 REST API 우회)

import type { ShushuEnv } from "@/types";

const R2_SCREENSHOT_PREFIX = "screenshots/";
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };

export interface CapturedScreenshots {
  desktopKey: string;
  mobileKey: string;
  desktopBytes: number;
  mobileBytes: number;
  capturedAt: string;
}

export async function captureSite(
  env: ShushuEnv,
  inspectionId: string,
  url: string,
): Promise<CapturedScreenshots | null> {
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return null;
  }

  const [desktopBuffer, mobileBuffer] = await Promise.all([
    fetchScreenshot(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, url, DESKTOP_VIEWPORT),
    fetchScreenshot(env.CF_ACCOUNT_ID, env.CF_API_TOKEN, url, MOBILE_VIEWPORT),
  ]);

  if (!desktopBuffer || !mobileBuffer) {
    return null;
  }

  const desktopKey = `${R2_SCREENSHOT_PREFIX}${inspectionId}-desktop.png`;
  const mobileKey = `${R2_SCREENSHOT_PREFIX}${inspectionId}-mobile.png`;

  await env.SHUSHU_R2.put(desktopKey, desktopBuffer);
  await env.SHUSHU_R2.put(mobileKey, mobileBuffer);

  return {
    desktopKey,
    mobileKey,
    desktopBytes: desktopBuffer.byteLength,
    mobileBytes: mobileBuffer.byteLength,
    capturedAt: new Date().toISOString(),
  };
}

async function fetchScreenshot(
  accountId: string,
  apiToken: string,
  url: string,
  viewport: { width: number; height: number },
): Promise<ArrayBuffer | null> {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/screenshot`;

  const body = {
    url,
    viewport,
    screenshotOptions: {
      type: "png",
      fullPage: false,
    },
    gotoOptions: {
      waitUntil: "networkidle0",
      timeout: 30000,
    },
  };

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`Browser Rendering API ${response.status}:`, await response.text());
      return null;
    }

    return await response.arrayBuffer();
  } catch (err) {
    console.error("Browser Rendering fetch failed:", err);
    return null;
  }
}

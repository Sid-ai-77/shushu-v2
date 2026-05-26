// Ingest 도메인 — screenshot
// Cloudflare Browser Rendering으로 데스크탑·모바일 캡처 + R2 저장

import puppeteer, { type BrowserWorker } from "@cloudflare/puppeteer";
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
  if (!env.BROWSER) {
    return null;
  }

  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

  try {
    browser = await puppeteer.launch(env.BROWSER as unknown as BrowserWorker);

    // Desktop 캡처
    const desktopPage = await browser.newPage();
    await desktopPage.setViewport(DESKTOP_VIEWPORT);
    await desktopPage.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const desktopBuffer = (await desktopPage.screenshot({
      type: "png",
      fullPage: false,
    })) as Uint8Array;
    await desktopPage.close();

    // Mobile 캡처
    const mobilePage = await browser.newPage();
    await mobilePage.setViewport(MOBILE_VIEWPORT);
    await mobilePage.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
    const mobileBuffer = (await mobilePage.screenshot({
      type: "png",
      fullPage: false,
    })) as Uint8Array;
    await mobilePage.close();

    await browser.close();
    browser = null;

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
  } catch (err) {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // ignore
      }
    }
    throw err;
  }
}

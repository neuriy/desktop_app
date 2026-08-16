import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

const OUT = path.join('/workspace/docs/demo');
const ART = path.join('/opt/cursor/artifacts');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ['--use-gl=swiftshader'],
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
  colorScheme: 'dark',
});
const page = await context.newPage();

await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  document.body.style.background =
    'radial-gradient(circle at 20% 20%, #1e1b4b, #09090b 55%, #000)';
});
await page.waitForTimeout(1500);

await page.screenshot({ path: path.join(OUT, 'login-panel.png'), fullPage: true });
await page.screenshot({ path: path.join(ART, 'login-panel.png'), fullPage: true });

const email = `neuriy.desktop.${Date.now()}@mailinator.com`;
const password = `Demo-${Math.random().toString(36).slice(2)}A1!`;

await page.getByPlaceholder('Email address').fill(email);
await page.waitForTimeout(400);
await page.getByPlaceholder('Password').fill(password);
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Continue', exact: true }).click();

try {
  await Promise.race([
    page.getByText('Ask Neuriy anything').waitFor({ timeout: 25000 }),
    page.getByRole('alert').waitFor({ timeout: 25000 }),
  ]);
} catch {
  /* continue */
}

await page.waitForTimeout(2500);

const signedIn = (await page.getByText('Ask Neuriy anything').count()) > 0;
if (signedIn) {
  await page.screenshot({ path: path.join(OUT, 'desktop-signed-in.png'), fullPage: true });
  await page.screenshot({ path: path.join(ART, 'desktop-signed-in.png'), fullPage: true });
  console.log('SIGNED_IN_OK', email);
} else {
  const err = await page.getByRole('alert').textContent().catch(() => '');
  await page.screenshot({ path: path.join(OUT, 'login-error-state.png'), fullPage: true });
  await page.screenshot({ path: path.join(ART, 'login-error-state.png'), fullPage: true });
  console.log('SIGNED_IN_FAIL', err || 'unknown');
}

const videoPath = await page.video()?.path();
await context.close();
await browser.close();

if (videoPath && fs.existsSync(videoPath)) {
  const shortWebm = path.join(OUT, 'auth-flow-short.webm');
  fs.renameSync(videoPath, shortWebm);
  console.log('VIDEO', shortWebm);
}

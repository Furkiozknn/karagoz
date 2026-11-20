// Duman testi: sayfa aciliyor mu, konsol hatasi var mi, oyun basliyor mu, bir etkilesim durumu degistiriyor mu,
// telefon gorunumunde tasma var mi. Bagimlilik: playwright-core (depoya commit edilmez).
// Kullanim:  node test/duman.mjs [kok-klasor]            (varsayilan: bu deponun koku)
//   PW_CORE=<playwright-core klasoru>   CHROMIUM=<chrome.exe>   (bulunamazsa hata verir)
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(process.argv[2] || join(here, '..'));
const req = createRequire(import.meta.url);
let pw;
for (const p of [process.env.PW_CORE, 'playwright-core', 'playwright', 'D:/ClaudeCode/oyun-guncelleme/_test/node_modules/playwright-core']) {
  if (!p) continue;
  try { pw = req(p); break; } catch (e) { /* sonrakini dene */ }
}
if (!pw) { console.log('FAIL playwright-core bulunamadi (PW_CORE ile gosterin)'); process.exit(2); }
const adaylar = [process.env.CHROMIUM, process.env.LOCALAPPDATA && join(process.env.LOCALAPPDATA, 'ms-playwright/chromium-1208/chrome-win64/chrome.exe'),
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];
const exe = adaylar.find(x => x && existsSync(x));   // bulunamazsa playwright kendi varsayilanini dener
console.log('note tarayici: ' + (exe || 'playwright varsayilani'));
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp4': 'video/mp4', '.gif': 'image/gif', '.css': 'text/css' };
const srv = createServer((rq, rs) => {
  const p = normalize(decodeURIComponent(rq.url.split('?')[0])).replace(/^[\\/]+/, '');
  let f = join(root, p || 'index.html');
  if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
  if (!f.startsWith(root) || !existsSync(f)) { rs.writeHead(404); return rs.end('yok'); }
  rs.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); rs.end(readFileSync(f));
});
await new Promise(r => srv.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + srv.address().port + '/';
const IGN = /gc\.zgo\.at|goatcounter|fonts\.googleapis\.com|fonts\.gstatic\.com/;
let bad = 0;
const ok = m => console.log('ok   ' + m), no = m => { bad++; console.log('FAIL ' + m); };
const browser = await pw.chromium.launch({ executablePath: exe, headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function run(name, ctxOpts, kayit) {
  const ctx = await browser.newContext(ctxOpts); const page = await ctx.newPage();
  // kayit: onceki surumden kalma ya da bozuk localStorage degerleri (eski kayitla acilis kontrolu)
  if (kayit) await page.addInitScript(k => { try { for (const a in k) localStorage.setItem(a, k[a]); } catch (e) { /* yok */ } }, kayit);
  const errs = [], fails = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !IGN.test(m.text())) errs.push('console: ' + m.text().slice(0, 160)); });
  page.on('requestfailed', r => { if (!IGN.test(r.url())) fails.push(r.url() + ' ' + (r.failure() || {}).errorText); });
  page.on('response', r => { if (r.status() >= 400 && !IGN.test(r.url())) fails.push(r.status() + ' ' + r.url()); });
  await page.route(IGN, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.goto(base + '?nosave&lang=tr', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__loaded === true && !document.getElementById('b-play').disabled, null, { timeout: 90000 }).catch(() => {});
  const loaded = await page.evaluate(() => window.__loaded === true);
  loaded ? ok(name + ': sayfa yuklendi, Oyna dugmesi etkin') : no(name + ': oyun yuklenmedi');
  const title = await page.title();
  title && /Karag/.test(title) ? ok(name + ': baslik "' + title + '"') : no(name + ': baslik yok/yanlis: ' + title);
  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth }));
  ov.sw <= ov.iw + 1 ? ok(name + ': yatay tasma yok') : no(name + ': yatay tasma ' + JSON.stringify(ov));
  const out = await page.evaluate(() => [...document.querySelectorAll('#ov-title button, #ov-title a')].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 12), r: [r.left, r.top, r.right, r.bottom].map(Math.round) }; }).filter(o => o.r[0] < -1 || o.r[2] > innerWidth + 1 || o.r[1] < -1 || o.r[3] > innerHeight + 1));
  out.length ? no(name + ': baslik ekrani ogeleri disarida ' + JSON.stringify(out)) : ok(name + ': baslik ekrani ogeleri goruntu icinde');
  const tiny = await page.evaluate(() => [...document.querySelectorAll('#ov-title button, #ov-title a')].filter(e => e.offsetParent !== null).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || e.textContent.trim().slice(0, 12), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(o => o.h < 36 || o.w < 36));
  tiny.length ? console.log('note ' + name + ': 36px alti dokunma hedefleri ' + JSON.stringify(tiny)) : ok(name + ': dokunma hedefleri >= 36px');
  const sv = await page.evaluate(() => { const e = document.getElementById('ver-tag'); return e ? e.textContent : null; });
  console.log('note ' + name + ': surum etiketi = ' + (sv === null ? 'yok' : sv));
  await page.click('#b-play'); await page.waitForTimeout(500);
  const s1 = await page.evaluate(() => window.__game.read().screen);
  s1 === 'map' ? ok(name + ': Oyna -> perde haritasi') : no(name + ': Oyna sonrasi ekran ' + s1);
  await page.evaluate(() => { const b = document.querySelector('#acts .scn button'); if (b) b.click(); });
  await page.waitForTimeout(400);
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Space');
    if (await page.evaluate(() => window.__game.read().screen === 'play')) break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(500);
  const st = await page.evaluate(() => window.__game.read());
  st.screen === 'play' ? ok(name + ': sahne basladi (sahne ' + st.scene + ')') : no(name + ': sahne baslamadi, ekran=' + st.screen);
  const m0 = await page.evaluate(() => document.getElementById('s-moves').textContent + '|' + document.getElementById('s-match').textContent);
  for (const k of ['ArrowRight', 'ArrowRight', 'KeyQ', 'ArrowLeft', 'ArrowDown']) { await page.keyboard.press(k); await page.waitForTimeout(150); }
  const m1 = await page.evaluate(() => document.getElementById('s-moves').textContent + '|' + document.getElementById('s-match').textContent);
  m1 !== m0 ? ok(name + ': etkilesim sonrasi durum degisti (' + m0 + ' -> ' + m1 + ')') : no(name + ': etkilesim durumu degistirmedi (' + m0 + ')');
  await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
  const pz = await page.evaluate(() => !document.getElementById('ov-pause').hidden);
  pz ? ok(name + ': P ile duraklatma acildi') : no(name + ': duraklatma acilmadi');
  const ov2 = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  ov2 ? ok(name + ': oyun ici tasma yok') : no(name + ': oyun ici yatay tasma');
  const hudOut = await page.evaluate(() => [...document.querySelectorAll('#ov-pause button')].filter(e => e.offsetParent !== null).map(e => e.getBoundingClientRect()).filter(r => r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight).length);
  hudOut ? no(name + ': duraklatma dugmeleri disarida') : ok(name + ': duraklatma dugmeleri goruntu icinde');
  // yeni ozellikler (eski surumde yoksa yalniz not dusulur): rekor ve Yenilikler penceresi
  await page.keyboard.press('KeyP'); await page.waitForTimeout(300);
  await page.keyboard.press('KeyH');
  await page.waitForFunction(() => window.__game.read().screen === 'result', null, { timeout: 30000 }).catch(() => {});
  const sub = await page.evaluate(() => (document.getElementById('r-sub') || {}).textContent || '');
  const scr = await page.evaluate(() => window.__game.read().screen);
  scr === 'result' ? ok(name + ': ipucu ile sahne cozuldu, sonuc ekrani: "' + sub + '"') : no(name + ': sahne cozulmedi, ekran=' + scr);
  if (sv !== null) /rekor \d+ hamle/.test(sub) ? ok(name + ': sonuc ekraninda rekor gorunuyor') : no(name + ': rekor yazisi yok: ' + sub);
  if (sv !== null) {
    await page.evaluate(() => document.getElementById('b-rmap').click()); await page.waitForTimeout(300);
    const tip = await page.evaluate(() => document.querySelector('#acts .scn button').title);
    /rekor \d+ hamle/.test(tip) ? ok(name + ': perde haritasi ipucunda rekor: "' + tip + '"') : no(name + ': harita ipucunda rekor yok: ' + tip);
    await page.evaluate(() => document.getElementById('b-mapback').click()); await page.waitForTimeout(300);
    await page.click('#ver-tag'); await page.waitForTimeout(200);
    const items = await page.evaluate(() => ({ open: !document.getElementById('ov-news').hidden, n: document.querySelectorAll('#news-list li').length }));
    items.open && items.n >= 3 ? ok(name + ': Yenilikler penceresi acildi (' + items.n + ' madde)') : no(name + ': Yenilikler penceresi ' + JSON.stringify(items));
    await page.keyboard.press('Escape'); await page.waitForTimeout(200);
    (await page.evaluate(() => document.getElementById('ov-news').hidden)) ? ok(name + ': Esc ile kapandi') : no(name + ': Esc pencereyi kapatmadi');
  }
  errs.length ? no(name + ': konsol/sayfa hatalari ' + JSON.stringify(errs)) : ok(name + ': konsol hatasi yok');
  fails.length ? no(name + ': basarisiz istekler ' + JSON.stringify(fails)) : ok(name + ': basarisiz istek yok');
  await ctx.close();
}
try {
  await run('masaustu-1366x768', { viewport: { width: 1366, height: 768 } });
  await run('telefon-390x844', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  // eski surumden kalma kayit (rekor anahtari yok) ve bozuk kayit ile acilis
  await run('eski-kayit', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { 'arena.karagoz.save': '{"stars":[3,2,1],"cur":null,"hints":1}', 'arena.karagoz.best': '{"stars":6,"done":false,"moves":0}', 'arena.karagoz.settings': '{"lang":"tr"}' });
  await run('bozuk-kayit', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { 'arena.karagoz.rec': '[1,2]', 'arena.karagoz.save': 'null', 'arena.karagoz.best': '7' });
} catch (e) { no('beklenmeyen hata ' + e.message); }
await browser.close(); srv.close();
console.log(bad ? 'SONUC FAIL (' + bad + ')' : 'SONUC OK');
process.exit(bad ? 1 : 0);

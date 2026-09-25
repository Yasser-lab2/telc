import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

const requestedTeil = process.argv[2]?.toLowerCase();
const validTeile = new Set(['teil1', 'teil2', 'teil3']);
if (!validTeile.has(requestedTeil)) {
  console.error('Usage: node scripts/inspect-zertify-horen.mjs teil1|teil2|teil3');
  process.exit(1);
}

const teilNumber = Number(requestedTeil.at(-1));
const outputJson = `scraped/zertify-horen-${requestedTeil}.json`;
const outputScreenshot = `scraped/zertify-horen-${requestedTeil}.png`;
const contentSelector = '#hoeren-pdf-content';

await mkdir('scraped', { recursive: true });

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: { width: 1440, height: 1000 },
  args: ['--window-size=1440,1000'],
});

try {
  const page = await browser.newPage();

  await page.goto('https://www.zertify.app/#login', {
    waitUntil: 'networkidle2',
    timeout: 60_000,
  });

  console.log(`
Le navigateur est ouvert.

1. Connectez-vous manuellement à votre compte Zertify.
2. Ouvrez Hören Teil ${teilNumber}, puis l'exercice à extraire.
3. Vérifiez que le contenu et les lecteurs audio de Teil ${teilNumber} sont chargés.
4. Revenez dans ce terminal et appuyez sur Entrée.
`);

  await new Promise((resolve) => process.stdin.once('data', resolve));

  await page.waitForNetworkIdle({ idleTime: 1500, timeout: 30_000 }).catch(() => {});
  await page.waitForSelector(contentSelector, { visible: true, timeout: 30_000 }).catch(() => {
    console.warn(`${contentSelector} n'a pas été détecté. Un diagnostic de la page sera tout de même enregistré.`);
  });

  const result = await page.evaluate((selector, selectedTeil) => {
    const clean = (value) => value?.replace(/\s+/g, ' ').trim() ?? '';
    const root = document.querySelector(selector);

    const serializeControl = (element, index) => ({
      index,
      tag: element.tagName.toLowerCase(),
      type: element.getAttribute('type'),
      name: element.getAttribute('name'),
      value: element.value ?? null,
      checked: 'checked' in element ? element.checked : null,
      disabled: 'disabled' in element ? element.disabled : null,
      label: element.getAttribute('aria-label'),
    });

    const extractTeil = (teilNumber) => {
      if (!root) return null;
      const marker = new RegExp(`(?:Hören\\s*[-–—]?\\s*)?Teil\\s*${teilNumber}`, 'i');
      const candidates = [...root.querySelectorAll('section, article, div')]
        .filter((element) => marker.test(clean(element.textContent)))
        .sort((left, right) => clean(left.textContent).length - clean(right.textContent).length);
      const zone = candidates[0];
      if (!zone) return null;

      return {
        teil: teilNumber,
        text: clean(zone.innerText),
        html: zone.innerHTML,
        headings: [...zone.querySelectorAll('h1, h2, h3, h4, h5')]
          .map((element) => clean(element.textContent))
          .filter(Boolean),
        controls: [...zone.querySelectorAll('input, textarea, select')].map(serializeControl),
        buttons: [...zone.querySelectorAll('button')]
          .map((element, index) => ({ index, text: clean(element.textContent), ariaLabel: element.getAttribute('aria-label'), disabled: element.disabled }))
          .filter((item) => item.text || item.ariaLabel),
      };
    };

    const audioElements = [...document.querySelectorAll('audio')];
    const audioSources = audioElements.flatMap((audio, audioIndex) => {
      const sources = [audio.currentSrc, audio.src, ...[...audio.querySelectorAll('source')].map((source) => source.src)].filter(Boolean);
      return [...new Set(sources)].map((src) => ({ audioIndex, src }));
    });

    return {
      sourceUrl: window.location.href,
      pageTitle: document.title,
      scrapedAt: new Date().toISOString(),
      teil: selectedTeil,
      selector,
      selectorFound: Boolean(root),
      content: root ? {
        text: clean(root.innerText),
        html: root.innerHTML,
        headings: [...root.querySelectorAll('h1, h2, h3, h4, h5')]
          .map((element) => ({ level: element.tagName.toLowerCase(), text: clean(element.textContent) }))
          .filter((item) => item.text),
        controls: [...root.querySelectorAll('input, textarea, select')].map(serializeControl),
        buttons: [...root.querySelectorAll('button')]
          .map((element, index) => ({ index, text: clean(element.textContent), ariaLabel: element.getAttribute('aria-label'), disabled: element.disabled }))
          .filter((item) => item.text || item.ariaLabel),
        links: [...root.querySelectorAll('a[href]')]
          .map((element) => ({ text: clean(element.textContent), href: element.href }))
          .filter((item) => item.text || item.href),
      } : null,
      parts: [1, 2, 3].map(extractTeil),
      audioSources,
      visibleText: clean(document.body.innerText),
    };
  }, contentSelector, teilNumber);

  await writeFile(outputJson, JSON.stringify(result, null, 2), 'utf8');
  await page.screenshot({ path: outputScreenshot, fullPage: true });

  console.log('\nExtraction Hören terminée :');
  console.log(`- ${outputJson}`);
  console.log(`- ${outputScreenshot}`);
  console.log(`- Sélecteur trouvé : ${result.selectorFound ? 'oui' : 'non'}`);
  console.log(`- Partie enregistrée : Teil ${teilNumber}`);
  console.log(`- Sources audio détectées : ${result.audioSources.length}`);
} finally {
  await browser.close();
}

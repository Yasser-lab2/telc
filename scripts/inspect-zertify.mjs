import { mkdir, writeFile } from 'node:fs/promises';
import puppeteer from 'puppeteer';

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
2. Ouvrez la section Lesen.
3. Attendez que les modèles apparaissent.
4. Revenez ici et appuyez sur Entrée.
`);

  await new Promise((resolve) => {
    process.stdin.once('data', resolve);
  });

  await page
    .waitForNetworkIdle({
      idleTime: 1500,
      timeout: 30_000,
    })
    .catch(() => {});

  const selectors = {
    exerciseArea: '#root > div > main > div > main > div > div.flex-1.overflow-y-auto.px-4.sm\\:px-6.lg\\:px-8.pt-3.pb-8.custom-scroll.hidden.lg\\:block > div > div.space-y-6',
    sidePanel: '#root > div > main > div > main > div > div.w-full.lg\\:w-\\[500px\\].border-t.lg\\:border-t-0.lg\\:border-l.flex.flex-col.shrink-0.max-lg\\:flex-1.max-lg\\:overflow-hidden.lg\\:h-full.relative.bg-surface.border-border.flex',
  };

  // Absolute selectors from DevTools are fragile. Give the UI a short time to
  // settle, but never abort the export only because its DOM hierarchy changed.
  await page.waitForFunction(
    (targetSelectors) => {
      const hasExactZone = document.querySelector(targetSelectors.exerciseArea) || document.querySelector(targetSelectors.sidePanel);
      const hasExerciseText = /LESEVERSTEHEN|ÜBERSCHRIFTEN|TEIL\s*[123]/i.test(document.body.innerText);
      return Boolean(hasExactZone || hasExerciseText);
    },
    { timeout: 15_000 },
    selectors,
  ).catch(() => console.warn('Zones spécifiques non détectées; export de diagnostic de la page entière.'));

  const result = await page.evaluate((targetSelectors) => {
    const clean = (value) =>
      value?.replace(/\s+/g, ' ').trim() ?? '';

    const findZone = (kind, selector) => {
      const exact = document.querySelector(selector);
      if (exact) return { root: exact, foundBy: 'exact-selector' };

      const elements = [...document.querySelectorAll('main div')];
      if (kind === 'exerciseArea') {
        const byClasses = elements.find((element) =>
          element.classList.contains('space-y-6') &&
          /LESEVERSTEHEN|ÜBERSCHRIFTEN|TEIL\s*[123]/i.test(element.innerText),
        );
        if (byClasses) return { root: byClasses, foundBy: 'content-and-class-fallback' };

        const byContent = elements
          .filter((element) => /LESEVERSTEHEN|ÜBERSCHRIFTEN/i.test(element.innerText))
          .sort((a, b) => a.innerText.length - b.innerText.length)[0];
        if (byContent) return { root: byContent, foundBy: 'content-fallback' };
      }

      if (kind === 'sidePanel') {
        const byClasses = elements.find((element) =>
          element.classList.contains('lg:w-[500px]') &&
          element.classList.contains('flex-col'),
        );
        if (byClasses) return { root: byClasses, foundBy: 'class-fallback' };

        const byControls = elements
          .filter((element) => element.querySelectorAll('button, input, select').length >= 3)
          .filter((element) => /Überschriften|تحقق|النتيجة|التالي|السابق/i.test(element.innerText))
          .sort((a, b) => a.innerText.length - b.innerText.length)[0];
        if (byControls) return { root: byControls, foundBy: 'controls-fallback' };
      }

      return { root: null, foundBy: 'not-found' };
    };

    const extractZone = (kind, selector) => {
      const { root, foundBy } = findZone(kind, selector);
      if (!root) return null;

      return {
        selector,
        foundBy,
        text: clean(root.textContent),
        html: root.innerHTML,
        headings: [...root.querySelectorAll('h1, h2, h3, h4')]
          .map((element) => ({ level: element.tagName.toLowerCase(), text: clean(element.textContent) }))
          .filter((item) => item.text),
        buttons: [...root.querySelectorAll('button')]
          .map((element, index) => ({ index, text: clean(element.textContent), disabled: element.disabled, ariaLabel: element.getAttribute('aria-label') }))
          .filter((item) => item.text || item.ariaLabel),
        links: [...root.querySelectorAll('a[href]')]
          .map((element) => ({ text: clean(element.textContent), href: element.href }))
          .filter((item) => item.text),
        inputs: [...root.querySelectorAll('input, textarea, select')]
          .map((element, index) => ({ index, tag: element.tagName.toLowerCase(), type: element.getAttribute('type'), name: element.getAttribute('name'), value: element.value })),
      };
    };

    return {
      sourceUrl: window.location.href,
      title: document.title,
      scrapedAt: new Date().toISOString(),
      exerciseArea: extractZone('exerciseArea', targetSelectors.exerciseArea),
      sidePanel: extractZone('sidePanel', targetSelectors.sidePanel),

      headings: [...document.querySelectorAll('h1, h2, h3')]
        .map((element) => ({
          level: element.tagName.toLowerCase(),
          text: clean(element.textContent),
        }))
        .filter((item) => item.text),

      buttons: [...document.querySelectorAll('button')]
        .map((element) => clean(element.textContent))
        .filter(Boolean),

      links: [...document.querySelectorAll('a[href]')]
        .map((element) => ({
          text: clean(element.textContent),
          href: element.href,
        }))
        .filter((item) => item.text),

      visibleText: clean(document.body.innerText),
    };
  }, selectors);

  await writeFile(
    'scraped/zertify-lesen.json',
    JSON.stringify(result, null, 2),
    'utf8',
  );

  await page.screenshot({
    path: 'scraped/zertify-lesen.png',
    fullPage: true,
  });

  if (!result.exerciseArea) console.warn('Attention: exerciseArea introuvable. Vérifiez la capture et visibleText.');
  if (!result.sidePanel) console.warn('Attention: sidePanel introuvable. Vérifiez la capture et visibleText.');

  console.log('Extraction terminée :');
  console.log('- scraped/zertify-lesen.json');
  console.log('- scraped/zertify-lesen.png');
} finally {
  await browser.close();
}

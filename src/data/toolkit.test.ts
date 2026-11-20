import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getToolkitStats, TOOLKIT_CATEGORIES } from './toolkit';

test('toolkit contains all 7 requested categories in order', () => {
  assert.deepEqual(
    TOOLKIT_CATEGORIES.map((category) => category.title),
    [
      '01 — PROGRAMMING LANGUAGES',
      '02 — DATA MANIPULATION',
      '03 — DATA VISUALIZATION',
      '04 — DATABASES',
      '05 — STATISTICS & MACHINE LEARNING',
      '06 — DEVELOPMENT ENVIRONMENT',
      '07 — VERSION CONTROL & TOOLS',
    ],
  );
});

test('toolkit contains all 26 required technologies across the 7 disciplines', () => {
  const stats = getToolkitStats(TOOLKIT_CATEGORIES);
  assert.equal(stats.totalDisciplines, 7);
  assert.equal(stats.totalTools, 26);

  const names = TOOLKIT_CATEGORIES.flatMap((category) =>
    category.items.map((item) => item.name),
  );
  assert.deepEqual(names, [
    'Python',
    'SQL',
    'R',
    'NumPy',
    'Pandas',
    'Excel',
    'Matplotlib',
    'Seaborn',
    'Plotly',
    'Power BI',
    'Tableau',
    'PostgreSQL',
    'MySQL',
    'MongoDB',
    'Statistics',
    'Probability',
    'SciPy',
    'Statsmodels',
    'Scikit-learn',
    'Jupyter Notebook',
    'Anaconda',
    'Google Colab',
    'VS Code',
    'Git',
    'GitHub',
    'Docker',
  ]);
});

test('every toolkit item has unique id and an existing local SVG asset in public/icons', () => {
  const seenIds = new Set<string>();
  const seenIcons = new Set<string>();

  for (const category of TOOLKIT_CATEGORIES) {
    for (const item of category.items) {
      assert.equal(seenIds.has(item.id), false, `Duplicate item id: ${item.id}`);
      seenIds.add(item.id);

      assert.equal(
        item.icon.startsWith('/icons/') && item.icon.endsWith('.svg'),
        true,
        `Icon path must be local SVG under /icons/: ${item.icon}`,
      );
      assert.equal(seenIcons.has(item.icon), false, `Duplicate icon path: ${item.icon}`);
      seenIcons.add(item.icon);

      const diskPath = join(process.cwd(), 'public', item.icon);
      assert.equal(existsSync(diskPath), true, `Missing SVG asset on disk: ${diskPath}`);
      const content = readFileSync(diskPath, 'utf8');
      assert.equal(
        content.includes('<svg'),
        true,
        `Invalid SVG content in ${diskPath}`,
      );
    }
  }
});

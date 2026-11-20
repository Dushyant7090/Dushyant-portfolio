import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORK_PROJECTS,
  formatProjectCountLabel,
  getCaseStudyNeighbors,
} from './work';

test('WORK_PROJECTS contains all 3 required projects with accurate links and metadata', () => {
  assert.equal(WORK_PROJECTS.length, 3);
  assert.equal(formatProjectCountLabel(WORK_PROJECTS.length), '03 PROJECTS');

  const [fraud, tradewise, omegaup] = WORK_PROJECTS;
  assert.equal(fraud.title, 'Financial Fraud Detection');
  assert.equal(fraud.category, 'DATA SCIENCE · MACHINE LEARNING');
  assert.equal(fraud.githubUrl, 'https://github.com/juniorcl/transaction-fraud-detection');
  assert.equal(fraud.hasCaseStudy, true);
  assert.equal(fraud.metrics.length, 4);

  assert.equal(tradewise.title, 'TradeWise');
  assert.equal(tradewise.category, 'FINTECH · WEB APP');
  assert.equal(tradewise.githubUrl, 'https://github.com/Dushyant7090/TradeWise');
  assert.equal(tradewise.hasCaseStudy, true);

  assert.equal(omegaup.title, 'omegaUp');
  assert.equal(omegaup.category, 'OPEN SOURCE · SOFTWARE CONTRIBUTION');
  assert.equal(omegaup.githubUrl, 'https://github.com/Dushyant7090');
  assert.equal(omegaup.hasCaseStudy, false);
});

test('getCaseStudyNeighbors steps cleanly between interactive case studies', () => {
  const firstNav = getCaseStudyNeighbors(WORK_PROJECTS, 'financial-fraud-detection');
  assert.equal(firstNav.prev, null);
  assert.equal(firstNav.next?.id, 'tradewise');

  const secondNav = getCaseStudyNeighbors(WORK_PROJECTS, 'tradewise');
  assert.equal(secondNav.prev?.id, 'financial-fraud-detection');
  assert.equal(secondNav.next, null);
});

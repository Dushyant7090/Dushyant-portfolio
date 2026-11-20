export interface WorkMetric {
  label: string;
  value: string;
}

export interface WorkCaseStudy {
  challenge: string;
  architectureSteps: readonly string[];
  outcomeSummary: string;
}

export interface WorkProject {
  id: 'financial-fraud-detection' | 'tradewise' | 'omegaup';
  index: string;
  category: string;
  title: string;
  role: string;
  featured?: boolean;
  cardSummary: string;
  summary: string;
  outcomeNote: string;
  metrics: readonly WorkMetric[];
  stack: readonly string[];
  githubUrl: string;
  hasCaseStudy: boolean;
  caseStudy?: WorkCaseStudy;
}

export const WORK_PROJECTS: readonly WorkProject[] = [
  {
    id: 'financial-fraud-detection',
    index: '01',
    category: 'DATA SCIENCE · MACHINE LEARNING',
    title: 'Financial Fraud Detection',
    role: 'Independent Project',
    featured: true,
    cardSummary:
      'An end-to-end financial fraud detection project using a PaySim-style dataset with XGBoost, feature engineering and a real-time Flask prediction API (~R$57.25M estimated business profit).',
    summary:
      'An end-to-end financial fraud detection project built using a PaySim-style transaction dataset. It combines data cleaning, feature engineering, exploratory analysis, feature selection and XGBoost modeling to identify potentially fraudulent transactions. The project also includes a Flask API for real-time prediction requests.',
    outcomeNote:
      "The model reports 91.5% balanced accuracy, 94.4% precision and 82.9% recall on unseen data, with an estimated business profit of approximately R$57.25 million under the project's assumptions.",
    metrics: [
      { label: 'Balanced Accuracy', value: '91.5%' },
      { label: 'Precision', value: '94.4%' },
      { label: 'Recall', value: '82.9%' },
      { label: 'Est. Business Profit', value: 'R$57.25M' },
    ],
    stack: ['Python', 'Pandas', 'NumPy', 'XGBoost', 'Scikit-learn', 'Flask'],
    githubUrl: 'https://github.com/juniorcl/transaction-fraud-detection',
    hasCaseStudy: true,
    caseStudy: {
      challenge:
        'Highly imbalanced mobile-money transaction streams require capturing genuine fraud rings without triggering costly false positives on legitimate customer transfers.',
      architectureSteps: [
        'Cleaned PaySim-style transaction logs and audited balance deltas across origin and destination accounts.',
        'Engineered temporal, ratio, and balance-discrepancy features followed by exploratory correlation and feature-selection pruning.',
        'Trained and tuned an XGBoost classifier evaluated via precision-recall trade-offs, balanced accuracy, and business cost-benefit modeling.',
        'Exposed real-time inference through a lightweight Flask prediction endpoint for incoming transaction payloads.',
      ],
      outcomeSummary:
        'Achieved 91.5% balanced accuracy, 94.4% precision, and 82.9% recall on unseen test splits, translating to approximately R$57.25M in estimated net savings under project assumptions.',
    },
  },
  {
    id: 'tradewise',
    index: '02',
    category: 'FINTECH · WEB APP',
    title: 'TradeWise',
    role: 'Independent Project',
    cardSummary:
      'A financial education marketplace focused on transparent, verified trading insights, structured setups, and trader accountability in the Indian stock market.',
    summary:
      'TradeWise is a financial education marketplace focused on bringing transparency and accountability to the Indian equity trading ecosystem. It enables verified traders to share structured trade ideas with entry prices, stop-loss levels, targets and technical analysis, while providing performance tracking and accuracy scores to help users evaluate trading insights.',
    outcomeNote:
      'Built around the idea of moving beyond unverified trading signals towards evidence-based financial education.',
    metrics: [],
    stack: ['Flask', 'MySQL', 'JWT', 'Chart.js', 'FinTech'],
    githubUrl: 'https://github.com/Dushyant7090/TradeWise',
    hasCaseStudy: true,
    caseStudy: {
      challenge:
        'Retail learners in Indian equity markets often rely on informal, unverified chat tips that lack explicit risk bounds or historical track records.',
      architectureSteps: [
        'Designed a structured trade-idea schema requiring explicit entry levels, stop-loss boundaries, price targets, and written technical rationale.',
        'Implemented JWT-authenticated user roles separating verified educators from learners browsing market insights.',
        'Persisted historical idea records and outcome evaluations in MySQL to compute transparent trader accuracy metrics over time.',
        'Served the application workflows through a modular Flask backend connecting authentication, feed queries, and performance analytics.',
      ],
      outcomeSummary:
        'Replaced opaque tip-sharing patterns with auditable, structured trade theses backed by historical accountability scores.',
    },
  },
  {
    id: 'omegaup',
    index: '03',
    category: 'OPEN SOURCE · SOFTWARE CONTRIBUTION',
    title: 'omegaUp',
    role: 'Open Source Contributor',
    cardSummary:
      'Contributing to omegaUp, an open-source competitive programming platform. Worked on LoginV2 UX flows and backend HTTP request-handling improvements.',
    summary:
      'Contributing to omegaUp, an open-source competitive programming platform. Working with an established codebase, exploring application architecture, addressing issues and contributing improvements through the development workflow.',
    outcomeNote:
      'My contributions include work around the LoginV2 experience and research into backend HTTP request handling and request-size limits.',
    metrics: [],
    stack: ['Open Source', 'GitHub', 'Competitive Programming', 'Backend'],
    githubUrl: 'https://github.com/Dushyant7090',
    hasCaseStudy: false,
  },
];

export function formatProjectCountLabel(count: number): string {
  const padded = String(Math.max(0, count)).padStart(2, '0');
  return `${padded} ${count === 1 ? 'PROJECT' : 'PROJECTS'}`;
}

export function getCaseStudyNeighbors(
  projects: readonly WorkProject[],
  activeId: WorkProject['id'],
): { prev: WorkProject | null; next: WorkProject | null } {
  const caseProjects = projects.filter((p) => p.hasCaseStudy);
  const idx = caseProjects.findIndex((p) => p.id === activeId);
  if (idx === -1 || caseProjects.length <= 1) {
    return { prev: null, next: null };
  }
  return {
    prev: idx > 0 ? caseProjects[idx - 1] : null,
    next: idx < caseProjects.length - 1 ? caseProjects[idx + 1] : null,
  };
}

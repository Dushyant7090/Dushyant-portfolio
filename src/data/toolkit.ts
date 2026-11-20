export interface ToolkitItem {
  id: string;
  name: string;
  icon: string;
}

export interface ToolkitCategory {
  id: string;
  code: string;
  title: string;
  items: readonly ToolkitItem[];
}

export const TOOLKIT_CATEGORIES: readonly ToolkitCategory[] = [
  {
    id: 'programming-languages',
    code: '01',
    title: '01 — PROGRAMMING LANGUAGES',
    items: [
      { id: 'python', name: 'Python', icon: '/icons/python.svg' },
      { id: 'sql', name: 'SQL', icon: '/icons/sql.svg' },
      { id: 'r', name: 'R', icon: '/icons/r.svg' },
    ],
  },
  {
    id: 'data-manipulation',
    code: '02',
    title: '02 — DATA MANIPULATION',
    items: [
      { id: 'numpy', name: 'NumPy', icon: '/icons/numpy.svg' },
      { id: 'pandas', name: 'Pandas', icon: '/icons/pandas.svg' },
      { id: 'excel', name: 'Excel', icon: '/icons/excel.svg' },
    ],
  },
  {
    id: 'data-visualization',
    code: '03',
    title: '03 — DATA VISUALIZATION',
    items: [
      { id: 'matplotlib', name: 'Matplotlib', icon: '/icons/matplotlib.svg' },
      { id: 'seaborn', name: 'Seaborn', icon: '/icons/seaborn.svg' },
      { id: 'plotly', name: 'Plotly', icon: '/icons/plotly.svg' },
      { id: 'powerbi', name: 'Power BI', icon: '/icons/powerbi.svg' },
      { id: 'tableau', name: 'Tableau', icon: '/icons/tableau.svg' },
    ],
  },
  {
    id: 'databases',
    code: '04',
    title: '04 — DATABASES',
    items: [
      { id: 'postgresql', name: 'PostgreSQL', icon: '/icons/postgresql.svg' },
      { id: 'mysql', name: 'MySQL', icon: '/icons/mysql.svg' },
      { id: 'mongodb', name: 'MongoDB', icon: '/icons/mongodb.svg' },
    ],
  },
  {
    id: 'statistics-ml',
    code: '05',
    title: '05 — STATISTICS & MACHINE LEARNING',
    items: [
      { id: 'statistics', name: 'Statistics', icon: '/icons/statistics.svg' },
      { id: 'probability', name: 'Probability', icon: '/icons/probability.svg' },
      { id: 'scipy', name: 'SciPy', icon: '/icons/scipy.svg' },
      { id: 'statsmodels', name: 'Statsmodels', icon: '/icons/statsmodels.svg' },
      { id: 'scikit-learn', name: 'Scikit-learn', icon: '/icons/scikit-learn.svg' },
    ],
  },
  {
    id: 'development-environment',
    code: '06',
    title: '06 — DEVELOPMENT ENVIRONMENT',
    items: [
      { id: 'jupyter', name: 'Jupyter Notebook', icon: '/icons/jupyter.svg' },
      { id: 'anaconda', name: 'Anaconda', icon: '/icons/anaconda.svg' },
      { id: 'colab', name: 'Google Colab', icon: '/icons/colab.svg' },
      { id: 'vscode', name: 'VS Code', icon: '/icons/vscode.svg' },
    ],
  },
  {
    id: 'version-control-tools',
    code: '07',
    title: '07 — VERSION CONTROL & TOOLS',
    items: [
      { id: 'git', name: 'Git', icon: '/icons/git.svg' },
      { id: 'github', name: 'GitHub', icon: '/icons/github.svg' },
      { id: 'docker', name: 'Docker', icon: '/icons/docker.svg' },
    ],
  },
] as const;

export interface ToolkitStats {
  totalTools: number;
  totalDisciplines: number;
}

export function getToolkitStats(
  categories: readonly ToolkitCategory[] = TOOLKIT_CATEGORIES,
): ToolkitStats {
  const totalTools = categories.reduce((sum, category) => sum + category.items.length, 0);
  return {
    totalTools,
    totalDisciplines: categories.length,
  };
}

import { Category, DashboardSummary } from '../types';

export interface DashboardSnapshot { summary: DashboardSummary; categories: Category[]; savedAt: number; }
export const DASHBOARD_CACHE_KEY = 'fam_exp_dashboard_preview_v1';
export const DASHBOARD_REVISION_KEY = 'fam_exp_dashboard_revision';

export function validDashboard(value: unknown): value is DashboardSummary {
  const s = value as DashboardSummary | null;
  return !!s && Number.isInteger(s.year) && Number.isInteger(s.month) && s.month >= 1 && s.month <= 12
    && [s.total_income,s.total_expense,s.balance,s.savings_rate].every(Number.isFinite)
    && !!s.budget_summary && [s.budget_summary.total_budget,s.budget_summary.total_spent,s.budget_summary.remaining,s.budget_summary.percentage].every(Number.isFinite)
    && Array.isArray(s.recent_transactions) && Array.isArray(s.category_breakdown) && Array.isArray(s.member_breakdown);
}
let generation = 0;
export function dashboardRevision(): string {
  try { return `${generation}:${localStorage.getItem(DASHBOARD_REVISION_KEY) || ''}`; } catch { return String(generation); }
}
export function clearDashboardCache(): void {
  generation++;
  try {
    localStorage.removeItem(DASHBOARD_CACHE_KEY);
    localStorage.setItem(DASHBOARD_REVISION_KEY, `${Date.now()}-${Math.random()}`);
  } catch { /* Storage may be unavailable; server reads still work. */ }
}
export function readDashboardCache(scope: string, year: number, month: number): DashboardSnapshot | null {
  try {
    const stored = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || 'null');
    if (stored?.scope !== scope || !Array.isArray(stored.entries)) return null;
    const entry = stored.entries.find((e: DashboardSnapshot) => e?.summary?.year === year && e?.summary?.month === month);
    return entry && validDashboard(entry.summary) && Array.isArray(entry.categories) && Number.isFinite(entry.savedAt) ? entry : null;
  } catch { return null; }
}
export function writeDashboardCache(scope: string, entry: DashboardSnapshot): void {
  try {
    const old = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY) || 'null');
    const entries: DashboardSnapshot[] = old?.scope === scope && Array.isArray(old.entries) ? old.entries : [];
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({scope,entries:[entry,...entries.filter(e=>e?.summary && (e.summary.year !== entry.summary.year || e.summary.month !== entry.summary.month))].slice(0,6)}));
  } catch { /* A full/disabled cache must never block a transaction or a fresh read. */ }
}

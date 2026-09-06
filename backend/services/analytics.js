import config from '../config/index.js';
import investigationService from '../services/investigations/investigationService.js';

export async function getAnalytics() {
  const investigations = await investigationService.listInvestigations();
  const completed = investigations.filter((item) => item.status === 'completed').length;
  const active = investigations.filter((item) => ['queued', 'running', 'retrying'].includes(item.status)).length;

  return {
    totalCases: investigations.length,
    activeInvestigations: active,
    completedInvestigations: completed,
    addressesTracked: investigations.length,
    exchangesMapped: 0,
    alertsToday: 0,
    successRate: investigations.length ? `${Math.min(100, Math.round((completed / investigations.length) * 100))}%` : '0%',
    topRiskNetworks: ['Bitcoin', 'Ethereum'],
    recentActivity: investigations.slice(0, 10).map((item) => ({
      timestamp: item.created_at,
      event: `Investigation ${item.status}`,
      severity: item.status === 'completed' ? 'high' : 'medium',
    })),
    synthetic: config.DEMO_MODE,
    mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  };
}

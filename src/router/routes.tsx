import { lazy } from 'react';
import { Navigate, type RouteObject } from 'react-router';

const RuleSync = lazy(() => import('../pages/RuleSync'));
const McpSync = lazy(() => import('../pages/McpSync'));
const SkillsSync = lazy(() => import('../pages/SkillsSync'));

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/rule-sync" replace /> },
  { path: '/rule-sync', element: <RuleSync /> },
  { path: '/mcp-sync', element: <McpSync /> },
  { path: '/skills-sync', element: <SkillsSync /> },
];

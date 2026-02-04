import type { RouteObject } from 'react-router';
import { lazy } from 'react';
import { Navigate } from 'react-router';

const RuleSync = lazy(async () => import('../pages/RuleSync'));
const McpSync = lazy(async () => import('../pages/McpSync'));
const SkillsSync = lazy(async () => import('../pages/SkillsSync'));
const CommandsSync = lazy(async () => import('../pages/CommandsSync'));

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/rule-sync" replace /> },
  { path: '/rule-sync', element: <RuleSync /> },
  { path: '/mcp-sync', element: <McpSync /> },
  { path: '/skills-sync', element: <SkillsSync /> },
  { path: '/commands-sync', element: <CommandsSync /> },
];

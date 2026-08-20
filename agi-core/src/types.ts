/** Shared AGI Core types */

export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_FOR_USER'
  | 'PAUSED'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED';

export type MemoryKind = 'temporary' | 'relevant' | 'important' | 'persistent';

export type PermissionLevel = 'allow' | 'ask' | 'deny';

export type ModelRole =
  | 'fast'
  | 'reasoning'
  | 'coding'
  | 'vision'
  | 'embedding'
  | 'local';

export interface AgentUser {
  id: string;
  displayName?: string | null;
  email?: string | null;
}

export interface AgentEnvironment {
  platform: string;
  cwd: string;
  desktopConnected: boolean;
  agiVersion: string;
}

export interface AgentPermissions {
  webAccess: PermissionLevel;
  readFiles: PermissionLevel;
  writeFiles: PermissionLevel;
  runCommands: PermissionLevel;
  sendEmail: PermissionLevel;
  deleteFiles: PermissionLevel;
  installSoftware: PermissionLevel;
  financialActions: PermissionLevel;
}

export interface AgentStateSnapshot {
  agentId: string;
  agentName: string;
  user: AgentUser | null;
  sessionId: string;
  currentGoal: string | null;
  activeTaskId: string | null;
  permissionLevel: string;
  tools: string[];
  environment: AgentEnvironment;
  updatedAt: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  ts?: string;
}

export interface PlanStep {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'done' | 'failed' | 'skipped';
  dependsOn?: string[];
  toolName?: string;
  notes?: string;
}

export interface AgentPlan {
  goal: string;
  steps: PlanStep[];
  createdAt: string;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, { type: string; description?: string }>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameterSchema;
  permissions: (keyof AgentPermissions)[];
}

export interface ToolResult {
  ok: boolean;
  output: string;
  data?: unknown;
  error?: string;
}

export interface MemoryRecord {
  id: string;
  kind: MemoryKind;
  category: string;
  content: string;
  userId?: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  source: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AgentTask {
  id: string;
  userId?: string;
  goal: string;
  status: TaskStatus;
  plan?: AgentPlan;
  progress: number;
  currentStep?: string;
  result?: string;
  error?: string;
  events: AgentEvent[];
  createdAt: string;
  updatedAt: string;
}

export type AgentEventType =
  | 'AgentStarted'
  | 'PlanCreated'
  | 'MemoryRetrieved'
  | 'KnowledgeRetrieved'
  | 'ToolCalled'
  | 'ToolCompleted'
  | 'ToolFailed'
  | 'PlanUpdated'
  | 'UserApprovalRequested'
  | 'TaskCompleted'
  | 'TaskFailed'
  | 'Status'
  | 'FinalResponse';

export interface AgentEvent {
  type: AgentEventType;
  ts: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  user?: AgentUser;
  sessionId?: string;
  stream?: boolean;
}

export interface ChatResponse {
  reply: string;
  summary?: string;
  plan?: AgentPlan;
  taskId?: string;
  events: AgentEvent[];
  model?: string;
}

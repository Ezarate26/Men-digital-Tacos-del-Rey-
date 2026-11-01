export type ActionState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const idleAction: ActionState = {
  status: "idle",
  message: "",
};

export type DashboardCounts = {
  visitsTotal: number;
  visitsToday: number;
  visitsWeek: number;
  visitsMonth: number;
  visitsByDay: { day: string; total: number }[];
  attentionPending: number;
  attentionAssigned: number;
  attentionResolved: number;
  attentionTotal: number;
  activeTables: number;
  activeProducts: number;
  activeSections: number;
};

export type AppRole = "owner" | "admin" | "manager" | "waiter";

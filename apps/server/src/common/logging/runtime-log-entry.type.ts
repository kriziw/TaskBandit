export type RuntimeLogLevel = "log" | "warn" | "error" | "debug" | "verbose";

export type RuntimeLogEntry = {
  id: string;
  timestamp: string;
  level: RuntimeLogLevel;
  context: string | null;
  message: string;
  stack: string | null;
};

export interface CliCommandContext {
  cwd: string;
  stdout: Pick<typeof console, "log" | "error">;
}

export interface CliCommand {
  name: string;
  description: string;
  run(args: string[], context: CliCommandContext): Promise<void>;
}


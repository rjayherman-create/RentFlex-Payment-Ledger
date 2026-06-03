import { spawn } from "node:child_process";

const commands = [
  ["api", "node", ["server/index.mjs"]],
  ["web", "pnpm", ["dev"]]
];

const children = commands.map(([name, command, args]) => {
  const child = spawn(command, args, { shell: true, stdio: "pipe" });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  child.on("exit", (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
});

process.on("SIGINT", () => {
  for (const child of children) child.kill("SIGINT");
});

const { spawn } = require("child_process");
const path = require("path");

const projectDir = path.resolve(__dirname, "..");
process.chdir(projectDir);

// Start Next.js dev server
const next = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "dev", "--port", "3001"],
  { stdio: ["ignore", "pipe", "pipe"], cwd: projectDir }
);

next.stdout.on("data", (d) => process.stdout.write("[next] " + d));
next.stderr.on("data", (d) => process.stderr.write("[next] " + d));
next.on("exit", (code) => console.log("[next] exited:", code));

// Start bot runner
const bot = spawn("node", ["scripts/bot-runner.js"], {
  stdio: ["ignore", "pipe", "pipe"],
  cwd: projectDir,
});

bot.stdout.on("data", (d) => process.stdout.write("[bot] " + d));
bot.stderr.on("data", (d) => process.stderr.write("[bot] " + d));
bot.on("exit", (code) => console.log("[bot] exited:", code));

process.on("SIGINT", () => {
  next.kill();
  bot.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  next.kill();
  bot.kill();
  process.exit();
});

console.log("Starting Next.js dev server + bot runner...");

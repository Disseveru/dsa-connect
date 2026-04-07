import { runWorkerLoop, workerTick } from "@/lib/worker";

async function main() {
  const once = process.argv.includes("--once");
  if (once) {
    await workerTick();
    return;
  }
  await runWorkerLoop();
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

import { fatalExit } from "./lib/fatal-exit";
import { startServer } from "./server";

process.on("unhandledRejection", (reason) => {
  fatalExit("Unhandled promise rejection", reason, 1);
});

process.on("uncaughtException", (error) => {
  fatalExit("Uncaught exception", error, 1);
});

void startServer();

import { createServer } from "node:http";
import { createApp } from "./app";
import { env } from "./config/env";
import { attachMarketSocket } from "./websocket/marketSocket";

const server = createServer(createApp());
attachMarketSocket(server);

server.listen(env.port, () => {
  console.log(
    `[optionpulse] API listening on http://localhost:${env.port}/api (mode: ${env.marketDataMode})`,
  );
  console.log(`[optionpulse] WebSocket listening on ws://localhost:${env.port}/ws/market`);
});

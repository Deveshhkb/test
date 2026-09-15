import type { Server } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { UnderlyingSymbol } from "../../src/types/market";
import { getProvider } from "../providers";
import { getMarketStatus } from "../../src/utils/marketStatus";

const QUOTE_INTERVAL_MS = 2000;
const CHAIN_INTERVAL_MS = 5000;

interface ClientState {
  symbols: Set<UnderlyingSymbol>;
  chain: { symbol: UnderlyingSymbol; expiry: string } | null;
}

/**
 * Push channel for quotes and option-chain updates.
 *
 * Clients subscribe per instrument, and the hub sends only what changed, so the
 * browser can patch individual rows instead of rebuilding the whole table. The
 * polling loop here stands in for a vendor feed; swapping it for a real
 * subscription is a change inside this file only.
 */
export function attachMarketSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/ws/market" });
  const clients = new Map<WebSocket, ClientState>();

  wss.on("connection", (socket) => {
    clients.set(socket, { symbols: new Set(), chain: null });

    socket.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as {
          type?: string;
          symbols?: UnderlyingSymbol[];
          symbol?: UnderlyingSymbol;
          expiry?: string;
        };
        const state = clients.get(socket);
        if (!state) return;

        if (message.type === "subscribe:quotes" && Array.isArray(message.symbols)) {
          state.symbols = new Set(message.symbols);
        }
        if (message.type === "subscribe:chain" && message.symbol && message.expiry) {
          state.chain = { symbol: message.symbol, expiry: message.expiry };
        }
        if (message.type === "unsubscribe:chain") {
          state.chain = null;
        }
      } catch {
        socket.send(
          JSON.stringify({ type: "error", message: "Malformed subscription message." }),
        );
      }
    });

    socket.on("close", () => clients.delete(socket));
    socket.send(JSON.stringify({ type: "status", data: getMarketStatus() }));
  });

  const quoteTimer = setInterval(async () => {
    const provider = getProvider();
    for (const [socket, state] of clients) {
      if (socket.readyState !== socket.OPEN) continue;
      for (const symbol of state.symbols) {
        const quote = await provider.getIndexQuote(symbol);
        socket.send(JSON.stringify({ type: "quote", data: quote }));
      }
    }
  }, QUOTE_INTERVAL_MS);

  const chainTimer = setInterval(async () => {
    const provider = getProvider();
    for (const [socket, state] of clients) {
      if (socket.readyState !== socket.OPEN || !state.chain) continue;
      const chain = await provider.getOptionChain(state.chain.symbol, state.chain.expiry);
      socket.send(JSON.stringify({ type: "chain", data: chain }));
    }
  }, CHAIN_INTERVAL_MS);

  wss.on("close", () => {
    clearInterval(quoteTimer);
    clearInterval(chainTimer);
  });

  return wss;
}

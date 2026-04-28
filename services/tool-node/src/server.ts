import { createServer } from "node:http";
import { createSolidityScanner } from "./scanner/solidity-pattern-scanner.js";
import { invokeToolHandler } from "./handlers/invoke-tool.js";

export function createToolNodeServer() {
  const scanner = createSolidityScanner();

  return {
    capability: "solidity-static-analysis",
    handler: scanner,
    listen(port = Number(process.env.PORT ?? "4318")) {
      const server = createServer(async (request, response) => {
        if (request.method !== "POST" || request.url !== "/invokeTool") {
          response.statusCode = 404;
          response.end("Not found");
          return;
        }

        const chunks: Buffer[] = [];
        for await (const chunk of request) {
          chunks.push(Buffer.from(chunk));
        }

        const envelope = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const result = await invokeToolHandler(envelope, scanner);

        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify(result));
      });

      server.listen(port);
      return server;
    }
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const server = createToolNodeServer().listen();
  server.on("listening", () => {
    const address = server.address();
    if (address && typeof address === "object") {
      console.log(`OpenTool Mesh tool node listening on http://127.0.0.1:${address.port}`);
    }
  });
}

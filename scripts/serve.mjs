import { createServer } from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, sep, extname } from "node:path";

const root = await realpath(fileURLToPath(new URL("../", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".json": "application/json",
};
const server = createServer(async (request, response) => {
  try {
    const path = resolve(
      root,
      "." + decodeURIComponent(new URL(request.url, "http://local").pathname),
    );
    if (path !== root && !path.startsWith(root + sep))
      throw new Error("Outside root");
    const actual = await realpath(
      (await stat(path)).isDirectory() ? resolve(path, "index.html") : path,
    );
    const relative = actual.slice(root.length + 1);
    if (
      !actual.startsWith(root + sep) ||
      relative
        .split(sep)
        .some(
          (part) =>
            part.startsWith(".") ||
            ["node_modules", "attachments"].includes(part),
        )
    )
      throw new Error("Private file");
    const content = await readFile(actual);
    response.writeHead(200, {
      "Content-Type": types[extname(actual)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain" });
    response.end("Not found");
  }
});
server.listen(Number(process.env.PORT || 3000), "0.0.0.0", () =>
  console.log(`Osmosis Lab listening on port ${server.address().port}`),
);

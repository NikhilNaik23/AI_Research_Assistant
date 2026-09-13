const app = require("./app");
const connectDB = require("./config/db");
const { PORT } = require("./config/env");

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error("[server] failed to start:", err);
    process.exit(1);
  }
})();

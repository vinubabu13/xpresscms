// server.js
const express = require("express");
const apiRouter = require("./src/routes/api");

// Function to create and configure the Express app
function createServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

  //comment when npm packing
  app.listen(3000, () => {
    console.log(`Server is running on http://localhost:${3000}`);
  });

  app.use("/api", apiRouter);

  // Example route
  app.get("/", (req, res) => {
    res.send("Hello, World!");
  });

  return app;
}

//comment when npm packing
createServer();

module.exports = createServer;

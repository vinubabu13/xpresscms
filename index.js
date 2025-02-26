// server.js
const express = require("express");
const apiRouter = require("./src/routes/api");
const responseInterceptor = require("./src/utility/responseInterceptor");
const cors = require("cors"); // Make sure this line is included

// Function to create and configure the Express app
function createServer() {
  const app = express();

  // Middleware to parse JSON bodies
  app.use(express.json());

  app.use(responseInterceptor);

  // Use CORS middleware
  app.use(
    cors({
      origin: "http://localhost:5173", // replace with your frontend's URL
      methods: ["GET", "POST", "PUT", "DELETE"], // allowed methods
      allowedHeaders: ["Content-Type", "Authorization","ngrok-skip-browser-warning"], // allowed headers
    })
  );
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

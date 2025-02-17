// routes/api.js
const express = require("express");
const fs = require("fs");
const multer = require("multer");
const { createComponent } = require("../core/create-components");
const {
  createDynamicZone,
  addComponentsToDynamicZone,
} = require("../core/create-dynamiczone");
const {
  createPage,
  addFieldsToPage,
  addPageData,
  addPageComponent,
  addDataToComponent,
  getPageData,
} = require("../core/pages");
const db = require("../../database/connection");
const { addRelation } = require("../core/relation");
const {
  addFileField,
  addFile,
  performDbOperationsAndUpload,
} = require("../core/file");

const router = express.Router();

// 🗄️ Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads/"; // Directory to save files

    // Check if the directory exists
    fs.access(uploadDir, fs.constants.F_OK, (err) => {
      if (err) {
        // If directory does not exist, c reate it
        fs.mkdir(uploadDir, { recursive: true }, (mkdirErr) => {
          if (mkdirErr) {
            return cb(mkdirErr); // If folder creation fails, send an error
          }
          cb(null, uploadDir); // If folder creation is successful, proceed
        });
      } else {
        // If the directory exists, just save the file there
        cb(null, uploadDir);
      }
    });
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Rename file with timestamp
  },
});

const upload = multer({ storage });

// Example GET route
router.get("/", (req, res) => {
  res.send("Welcome to the API!");
});

// page data
router.get("/page/data/*", getPageData);

// Example POST route
router.post("/data", (req, res) => {
  const data = req.body;
  res.json({ message: "Data received", receivedData: data });
});

// Example route with a parameter
router.get("/greet/:name", (req, res) => {
  const { name } = req.params;
  res.send(`Hello, ${name}!`);
});

router.post("/create/component", createComponent);
router.post("/create/dynamiczone", createDynamicZone);
router.post("/add/components/dynamiczone", addComponentsToDynamicZone);
router.post("/create/page", createPage);
router.post("/page/add/fields", addFieldsToPage);
router.post("/page/add/data", addPageData);
router.post("/page/add/component", addPageComponent);
router.post("/page/add/component/data", addDataToComponent);
router.post("/page/add/relation", addRelation);

router.get("/page/schema", async (req, res) => {
  const { uid } = req?.query;

  const getPage = await db("pages").select("name").where("uuid", uid);

  //get page fields
  const getPageFields = await db(`${getPage[0].name}_page_fields`).select(
    "name",
    "type"
  );

  res.send({
    data: { name: getPage[0].name, fields: getPageFields },
  });
});

router.post("/add-field", addFileField);
router.post("/add/file", upload.single("file"), performDbOperationsAndUpload);
module.exports = router;

const db = require("../../database/connection");
const _ = require("lodash");
const { SINGLE_PAGE } = require("../utility/functions");

async function addFileField(req, res) {
  const trx = await db.transaction(); // Start a transaction

  try {
    console.log(req?.body);

    const { tableName, fieldName, fieldType } = req.body;

    // 1️⃣ Check if 'files' table exists; if not, create it
    const filesTableExists = await trx.schema.hasTable("files");
    if (!filesTableExists) {
      await trx.schema.createTable("files", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.timestamp("created_at").defaultTo(trx.fn.now());
      });
    }
    console.log(fieldName, "fieldName");

    // 3️⃣ Check if 'page_fields' table exists; if not, create it
    const pageFieldsTableExists = await trx.schema.hasTable(
      `${tableName}_page_fields`
    );
    if (!pageFieldsTableExists) {
      await trx.schema.createTable(`${tableName}_page_fields`, (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("type").notNullable();
      });
    } else {
      // 4️⃣ Ensure 'name' and 'type' columns exist in 'page_fields'
      const hasNameColumn = await trx.schema.hasColumn(
        `${tableName}_page_fields`,
        "name"
      );
      const hasTypeColumn = await trx.schema.hasColumn(
        `${tableName}_page_fields`,
        "type"
      );

      if (!hasNameColumn) {
        await trx.schema.alterTable(`${tableName}_page_fields`, (table) => {
          table.string("name").notNullable();
        });
      }
      if (!hasTypeColumn) {
        await trx.schema.alterTable(`${tableName}_page_fields`, (table) => {
          table.string("type").notNullable();
        });
      }
    }

    // 5️⃣ Insert field into 'page_fields' if not already there
    const existingField = await trx(`${tableName}_page_fields`)
      .where({ name: fieldName, type: fieldType })
      .first();

    if (!existingField) {
      await trx(`${tableName}_page_fields`).insert({
        name: fieldName,
        type: fieldType,
      });
    }

    // 6️⃣ Check if the page data table exists
    const pageTableExists = await trx.schema.hasTable(`${tableName}_page_data`);
    if (!pageTableExists) {
      await trx.schema.createTable(`${tableName}_page_data`, (table) => {
        table.increments("id").primary();
        table.integer(`${fieldName}_id`).unsigned();
        table
          .foreign(`${fieldName}_id`)
          .references("id")
          .inTable("files")
          .onDelete("CASCADE");
      });
    } else {
      // 7️⃣ Add the new column if it doesn't exist
      const hasColumn = await trx.schema.hasColumn(
        tableName,
        `${fieldName}_id`
      );
      if (!hasColumn) {
        await trx.schema.alterTable(`${tableName}_page_data`, (table) => {
          table.integer(`${fieldName}_id`).unsigned();
          table
            .foreign(`${fieldName}_id`)
            .references("id")
            .inTable("files")
            .onDelete("CASCADE");
        });
      }
    }

    await trx.commit(); // Commit transaction if everything is successful
    return res.send({ message: "File field added successfully!" });
  } catch (error) {
    await trx.rollback(); // Rollback transaction on error
    console.error("Error:", error);
    return res.status(500).send({ message: "Something went wrong!" });
  }
}

async function addFile(req, res) {
  console.log(req?.file, "request");

  res.status(200).send({ message: "File uploaded successfully!" });
}

// Custom middleware to perform DB operations before file upload
const performDbOperationsAndUpload = async (req, res, next) => {
  const trx = await db.transaction(); // Start a transaction
  try {
    const fieldId = req?.body?.fieldId;
    const tableName = req?.body?.table;
    const type = req?.body?.type;
    const file = req.file; // File details from multer

    // Step 1️⃣: Check if file exists in req.file
    if (!file) {
      return res.status(400).send({ message: "No file uploaded." });
    }

    // Step 2️⃣: Insert the file into the 'files' table and get the file ID
    const [fileId] = await trx("files")
      .insert({
        name: file.filename, // Store the file with the original name
      })
      .returning("id");
    console.log("fileId", fileId?.id);

    // Step 3️⃣: Fetch the field name from 'page_fields' table using the fieldId provided
    const pageField = await trx(`${tableName}_page_fields`)
      .select("name")
      .where("id", fieldId)
      .first();

    if (!pageField) {
      // Rollback transaction and return error if field is not found
      await trx.rollback();
      return res.status(404).send({ message: "Field not found in table." });
    }

    if (type == SINGLE_PAGE) {
      // Step 5️⃣: If the field exists, insert/update the 'page_data' table with the file name
      await trx(`${tableName}_page_data`).update({
        [`${pageField.name}_id`]: fileId?.id, // Store the file name in the respective field
      });
    }

    // Commit the transaction if all operations were successful
    await trx.commit();

    // Step 6️⃣: Proceed to the next middleware (multer will handle the file storage)
    next();
  } catch (error) {
    // Rollback transaction in case of an error
    await trx.rollback();
    console.error("DB operation error:", error);
    return res.status(500).send({ message: "Database operation failed" });
  }
};

module.exports = {
  addFileField,
  addFile,
  performDbOperationsAndUpload,
};

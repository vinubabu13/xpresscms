const db = require("../../database/connection");
const { createTable } = require("./create-tables");
const _ = require("lodash");

async function createComponent(req, res) {
  const { name, fields, repeatable } = req.body;

  // Convert the table name to snake_case
  const formattedTableName = _.snakeCase(name);

  try {
    // Check if the table already exists
    const tableExists = await db.schema.hasTable(formattedTableName);

    if (tableExists) {
      return res.status(400).json({ error: `Table '${name}' already exists.` });
    }

    // Create schema for table
    await db.schema.createTable(`${formattedTableName}_fields`, (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("type").defaultTo(false);
    });

    // Insert field definitions into the component_name_fields table
    const fieldDefinitions = fields.map((field) => ({
      name: field.name,
      type: field.type,
    }));

    await db(`${formattedTableName}_fields`).insert(fieldDefinitions);

    //add to components table
    await createComponentsTableAndAddData({
      name: formattedTableName,
      repeatable: repeatable || false,
    });

    console.log(`Table '${name}' created successfully.`);
    res.status(201).json({ message: `Table '${name}' created successfully.` });
  } catch (error) {
    console.error("Error creating table:", error);
    res.status(500).json({ error: "Error creating table." });
  }
}

async function createComponentsTableAndAddData(data) {
  try {
    const tableExists = await db.schema.hasTable("components");

    if (!tableExists) {
      await db.schema.createTable("components", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.boolean("repeatable").defaultTo(false);
      });
      console.log("Table 'components' created successfully.");
    } else {
      console.log("Table 'components' already exists.");
    }

    // Insert data into the components table
    await db("components").insert(data);
    console.log("Data inserted successfully into the components table.");
  } catch (error) {
    console.error("Error creating table or inserting data:", error);
  } finally {
    // Destroy the Knex instance to close the connection pool
    await db.destroy();
  }
}

module.exports = {
  createComponent,
};

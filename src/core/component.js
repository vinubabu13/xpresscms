const { validationResult } = require("express-validator");
const db = require("../../database/connection");
const _ = require("lodash");

async function createComponent(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, fields, repeatable } = req.body;
  const formattedTableName = _.snakeCase(name);

  try {
    // Start a transaction
    await db.transaction(async (trx) => {
      // Check if the table already exists
      const tableExists = await trx.schema.hasTable(
        `${formattedTableName}_fields`
      );
      if (tableExists) {
        throw { status: 400, message: `Table '${name}' already exists.` };
      }

      // Create schema for table
      await trx.schema.createTable(`${formattedTableName}_fields`, (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("type").defaultTo("string");
      });

      // Insert field definitions into the component_name_fields table
      const fieldDefinitions = fields.map((field) => ({
        name: field.name,
        type: field.type,
      }));
      await trx(`${formattedTableName}_fields`).insert(fieldDefinitions);

      // Add to components table
      await createComponentsTableAndAddData(
        {
          name: formattedTableName,
          repeatable: repeatable || false,
        },
        trx
      );
    });

    console.log(`Component '${name}' created successfully.`);
    res
      .status(201)
      .json({ message: `Component '${name}' created successfully.` });
  } catch (error) {
    console.error("Error creating component:", error);
    next(error); // Pass error to global error handler
  }
}

async function createComponentsTableAndAddData(data, trx) {
  try {
    const tableExists = await trx.schema.hasTable("components");
    if (!tableExists) {
      await trx.schema.createTable("components", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.boolean("repeatable").defaultTo(false);
      });
      console.log("Table 'components' created successfully.");
    } else {
      console.log("Table 'components' already exists.");
    }

    // Insert data into the components table
    await trx("components").insert(data);
  } catch (error) {
    console.error("Error creating table or inserting data:", error);
    throw error; // Rethrow error to trigger transaction rollback
  }
}

async function getComponents(req, res) {
  try {
    const components = await db("components").select("name", "id");
    res.status(200).send({ data: components });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .send({ error: "Internal Server Error", details: error.message });
  }
}

async function getComponentStructure(req, res) {
  try {
    const { uid: componentId } = req.query;

    if (!componentId) {
      return res.status(400).send({ message: "Component ID is required" });
    }

    const componentExists = await checkComponentExists(componentId);

    if (componentExists) {
      try {
        const componentFields = await db(`${componentId}_fields`).select(
          "name",
          "type"
        );

        return res
          .status(200)
          .send({ data: { component: componentId, fields: componentFields } });
      } catch (error) {
        console.error("Error fetching component fields:", error);
        return res
          .status(500)
          .send({ message: "Error fetching component fields" });
      }
    } else {
      return res.status(404).send({ message: "Component not found!" });
    }
  } catch (error) {
    console.error("Error in getComponentStructure:", error);
    return res.status(500).send({ message: "Internal server error" });
  }
}

async function checkComponentExists(componentName) {
  try {
    const exists = await db("components").where("name", componentName).first();
    return !!exists;
  } catch (error) {
    console.error("Error checking component existence:", error);
    throw new Error("Database query failed");
  }
}

module.exports = {
  createComponent,
  getComponents,
  getComponentStructure,
};

const db = require("../../database/connection");
const _ = require("lodash");
async function createDynamicZone(req, res) {
  const { pageUid, name } = req.body;

  //check whether page table exists

  // Convert the table name to snake_case
  const formattedDynamicZoneName = _.snakeCase(name);

  try {
    // Check if the table already exists
    const tableExists = await db.schema.hasTable(
      `${pageUid}_${formattedDynamicZoneName}_dynamiczone`
    );

    if (tableExists) {
      return res.status(400).json({ error: `Table '${name}' already exists.` });
    }

    //check whether dynamiczones table is created
    const dynamicZoneTableExists = await db.schema.hasTable(`dynamiczones`);

    if (!dynamicZoneTableExists) {
      //create dynamiczones table with fields name and id
      await db.schema.createTable(`dynamiczones`, (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("table").notNullable();
      });

      //add dynamic zone name to dynamiczones table
      await db("dynamiczones").insert({
        name: formattedDynamicZoneName,
        table: `${pageUid}_${formattedDynamicZoneName}_dynamiczone`,
      });
    } else {
      //add dynamic zone name to dynamiczones table
      await db("dynamiczones").insert({
        name: formattedDynamicZoneName,
        table: `${pageUid}_${formattedDynamicZoneName}_dynamiczone`,
      });
    }

    //create a new table with page name and dynamic zone example home_components_dynamiczone
    //set relation to components in components table
    await db.schema.createTable(
      `${pageUid}_${formattedDynamicZoneName}_dynamiczone`,
      (table) => {
        table.increments("id").primary();
        table.string("component_name").notNullable();
        table
          .integer("component_id")
          .unsigned()
          .references("id")
          .inTable("components")
          .onDelete("CASCADE");
      }
    );

    res.status(201).json({ message: "Dynamic zone created successfully." });

    //need to add relation to page as well
  } catch (error) {}
}

async function addComponentsToDynamicZone(req, res) {
  const { pageUid, zone_name, components } = req?.body;

  if (!components) {
    return res.status(400).json({ error: "No components provided." });
  }

  const formattedDynamicZoneName = _.snakeCase(zone_name);

  // Check if the table already exists
  const tableExists = await db.schema.hasTable(
    `${pageUid}_${formattedDynamicZoneName}_dynamiczone`
  );

  if (!tableExists) {
    return res
      .status(400)
      .json({ error: `Table '${zone_name}' doesn't exists.` });
  }

  //add data to the table
  await db(`${pageUid}_${formattedDynamicZoneName}_dynamiczone`).insert(
    components
  );

  for (let i = 0; i < components.length; i++) {
    const componentData = await db(`components`)
      .where("id", components[i]?.component_id)
      .select("name");

    const componentFields = await db(`${componentData[0].name}_fields`).select(
      "name",
      "type"
    );

    //create new table to insert data for each component with name of component, dynamic zone and page name.
    const formattedComponentName = _.snakeCase(components[i]?.component_name);

    await db.schema.createTable(
      `${pageUid}_${formattedDynamicZoneName}_${formattedComponentName}_component_data`,
      (table) => {
        table.increments("id").primary();
        //fetch fields dynamically from the componentFields table use the same name and type
        componentFields.forEach((field) => {
          if (field.type === "string") {
            table.string(field.name); // String type for the field
          } else if (field.type === "integer") {
            table.integer(field.name); // Integer type for the field
          } else if (field.type === "boolean") {
            table.boolean(field.name); // Boolean type for the field
          } else if (field.type === "date") {
            table.date(field.name); // Date type for the field
          } else if (field.type === "richtext") {
            table.text(field.name); // Text type for the field
          } else if (field.type === "image") {
            table.string(field.name); // Text type for the field
          }
          // Add more field types as needed
        });
        // Optionally add other columns (e.g., timestamp, foreign keys)
        table.timestamps(true, true); // Adds created_at and updated_at columns
      }
    );
  }

  //fetch components fields using its id from the components table

  return res.send({ message: "Components added successfully !" });
}

module.exports = {
  createDynamicZone,
  addComponentsToDynamicZone,
};

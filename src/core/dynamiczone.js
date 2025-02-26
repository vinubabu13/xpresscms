const db = require("../../database/connection");
const _ = require("lodash");
async function createDynamicZone(req, res) {
  const { pageUid, name } = req.body;
  const formattedDynamicZoneName = _.snakeCase(name);
  const tableName = `${pageUid}_${formattedDynamicZoneName}_dynamiczone`;

  const trx = await db.transaction();
  try {
    const tableExists = await trx.schema.hasTable(tableName);
    if (tableExists) {
      await trx.rollback();
      return res.status(400).json({ error: `Table '${name}' already exists.` });
    }

    const dynamicZoneTableExists = await trx.schema.hasTable("dynamiczones");
    if (!dynamicZoneTableExists) {
      await trx.schema.createTable("dynamiczones", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("table").notNullable();
      });
    }

    await trx("dynamiczones").insert({
      name: formattedDynamicZoneName,
      table: tableName,
    });

    await trx.schema.createTable(tableName, (table) => {
      table.increments("id").primary();
      table.string("component_name").notNullable();
      table
        .integer("component_id")
        .unsigned()
        .references("id")
        .inTable("components")
        .onDelete("CASCADE");
    });

    await trx(`${pageUid}_page_fields`).insert({
      name: formattedDynamicZoneName,
      type: "dynamiczone",
    });

    await trx.commit();
    res.status(201).json({ message: "Dynamic zone created successfully." });
  } catch (error) {
    await trx.rollback();
    console.error(error);
    res.status(500).json({ error: "Failed to create dynamic zone." });
  }
}

async function addComponentsToDynamicZone(req, res) {
  const { pageUid, zone_name, components } = req?.body;

  if (!components) {
    return res.status(400).json({ error: "No components provided." });
  }

  const formattedDynamicZoneName = _.snakeCase(zone_name);
  const tableName = `${pageUid}_${formattedDynamicZoneName}_dynamiczone`;

  const trx = await db.transaction();
  try {
    const tableExists = await trx.schema.hasTable(tableName);
    if (!tableExists) {
      await trx.rollback();
      return res
        .status(400)
        .json({ error: `Table '${zone_name}' doesn't exist.` });
    }

    await trx(tableName).insert(components);

    for (let i = 0; i < components.length; i++) {
      const componentData = await trx("components")
        .where("id", components[i]?.component_id)
        .select("name");

      const componentFields = await trx(
        `${componentData[0].name}_fields`
      ).select("name", "type");
      const formattedComponentName = _.snakeCase(components[i]?.component_name);
      const componentTableName = `${pageUid}_${formattedDynamicZoneName}_${formattedComponentName}_component_data`;

      await trx.schema.createTable(componentTableName, (table) => {
        table.increments("id").primary();
        componentFields.forEach((field) => {
          if (field.type === "string") {
            table.string(field.name);
          } else if (field.type === "integer") {
            table.integer(field.name);
          } else if (field.type === "boolean") {
            table.boolean(field.name);
          } else if (field.type === "date") {
            table.date(field.name);
          } else if (field.type === "richtext") {
            table.text(field.name);
          } else if (field.type === "image") {
            table.string(field.name);
          }
        });
        table.timestamps(true, true);
      });
    }

    await trx.commit();
    return res.send({ message: "Components added successfully!" });
  } catch (error) {
    await trx.rollback();
    console.error(error);
    return res.status(500).json({ error: "Failed to add components." });
  }
}

module.exports = {
  createDynamicZone,
  addComponentsToDynamicZone,
};

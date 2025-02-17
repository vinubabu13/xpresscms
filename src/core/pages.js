const db = require("../../database/connection");
const { getPageUid, SINGLE_PAGE } = require("../utility/functions");
const _ = require("lodash");
const queryBuilder = require("./queryBuilder");

async function createPage(req, res) {
  const { name, type } = req.body;

  // Convert the table name to snake_case
  const formattedTableName = _.snakeCase(name);

  // Example usage
  const pageUid = await getPageUid(name);
  //check whether a page table exists
  const tableExists = await db.schema.hasTable("pages");

  if (!tableExists) {
    await db.schema.createTable("pages", (table) => {
      table.increments("id").primary();
      table.string("name").notNullable();
      table.string("type").notNullable();
      table.string("uuid").notNullable().unique();
    });

    await db("pages").insert({
      name: formattedTableName,
      type,
      uuid: pageUid,
    });
  } else {
    //insert the page details into the table
    await db("pages").insert({
      name: formattedTableName,
      type,
      uuid: pageUid,
    });
  }

  //create a table with the page name with fields and type as columns
  await db.schema.createTable(`${formattedTableName}_page_fields`, (table) => {
    table.increments("id").primary();
    table.string("name").notNullable();
    table.string("type").notNullable();
  });

  // //create a table with the page name with fields and type as columns
  // await db.schema.createTable(
  //   `${formattedTableName}_page_components`,
  //   (table) => {
  //     table.increments("id").primary();
  //     table.string("name").notNullable();
  //     table
  //       .integer("component_id") // Foreign key column
  //       .unsigned()
  //       .references("id")
  //       .inTable("components") // Reference to the components table
  //       .notNullable();
  //   }
  // );

  // //create a table with the page name with fields and type as columns
  // await db.schema.createTable(
  //   `${formattedTableName}_page_dynamiczones`,
  //   (table) => {
  //     table.increments("id").primary();
  //     table.string("name").notNullable();
  //     table
  //       .integer("dynamiczone_id") // Foreign key column
  //       .unsigned()
  //       .references("id")
  //       .inTable("dynamiczones") // Reference to dynamiczones table
  //       .onDelete("SET NULL") // If related dynamic zone is deleted, set this to NULL
  //       .nullable();
  //   }
  // );
  return res.send({ message: `${name} page created successfully !` });
}

async function addFieldsToPage(req, res) {
  const { pageUid, fields } = req.body;

  //using pageUid find name from the pages table
  const pageName = await db("pages").select("name").where("uuid", pageUid);

  //change the name to snake_case
  const formattedTableName = _.snakeCase(pageName[0].name);

  //insert the page details into the table
  await db(`${formattedTableName}_page_fields`).insert(fields);

  await addPageDataTable({ pageUid, data: fields });

  res.send({ message: "Fields added successfully !" });
}

async function addPageDataTable(params) {
  const { pageUid } = params;

  //using pageUid find name from the pages table
  const pageName = await db("pages").select("name").where("uuid", pageUid);

  //change the name to snake_case
  const formattedTableName = _.snakeCase(pageName[0].name);

  //create a new table with name which will have columns in the table table_name_page_fields

  const pageFields = await db(`${formattedTableName}_page_fields`).select(
    "name",
    "type"
  );

  // Step 2: Create the second table
  await db.schema.createTable(`${formattedTableName}_page_data`, (table) => {
    table.increments("id").primary(); // Primary key for the new table

    // Step 3: Loop through each field from the first table and create a corresponding column
    pageFields.forEach((field) => {
      const { name, type } = field;

      // Dynamically create columns based on the type
      if (type === "string") {
        table.string(name).notNullable(); // String column
      } else if (type === "integer") {
        table.integer(name).notNullable(); // Integer column
      } else if (type === "boolean") {
        table.boolean(name).notNullable(); // Boolean column
      } else if (type === "text") {
        table.text(name).notNullable(); // Text column
      } else if (type === "date") {
        table.date(name).notNullable(); // Date column
      } else {
        // Handle other types as needed (e.g., datetime, decimal, etc.)
        table.text(name).notNullable();
      }
    });
  });
}

async function addPageData(req, res) {
  const { pageUid, data } = req?.body;

  //using pageUid find name from the pages table
  const pageName = await db("pages")
    .select(["name", " type"])
    .where("uuid", pageUid);
  console.log(pageName, "uid");

  if (pageName[0].type === SINGLE_PAGE) {
    const existingRecord = await db(`${pageName[0].name}_page_data`).first(); // Check if the table has any data

    if (existingRecord) {
      console.log(existingRecord);
      db("home_page_data").where("id", 3).update({ title: "title" });
      return res.send({ message: "Data updated successfully !" });
    } else {
      await db(`${pageName[0].name}_page_data`).insert(data);
    }
    // await insertOrUpdate(db, pageName, data);
  } else {
    await db(`${pageName[0].name}_page_data`).insert(data);
  }
  // using name select the table for example if home is pageName then table will be home_page_data

  res.send({ message: "Data added successfully !" });
}

async function addPageComponent(req, res) {
  const { pageUid, component_id, component_name, name } = req?.body;

  //using pageUid find name from the pages table
  const pageName = await db("pages").select("name").where("uuid", pageUid);

  //fetch fields of the component from the component table
  const componentFields = await db(`${component_name}_fields`).select(
    "name",
    "type"
  );
  //add the component name and type to the home page field and relation to component table
  //convert name to snakeCase
  const componentName = _.snakeCase(name);

  await db(`${pageName[0].name}_page_fields`).insert({
    name: componentName,
    type: "component",
    component_id: component_id,
  });

  // Construct the table name dynamically
  const tableName = `${pageName[0].name}_${componentName}_component_data`;

  // Create the new table dynamically based on component fields
  await db.schema.createTable(tableName, function (table) {
    // Add an auto-increment primary key
    table.increments("id").primary();

    // Loop through componentFields to create columns
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
  });

  res.send({ message: "Component added successfully !" });
}

async function addDataToComponent(req, res) {
  const { pageUid, component_id, name, data } = req?.body;

  //get page name
  const pageData = await db("pages").where("uuid", pageUid).select("name");

  //check component repeatable or not
  const fieldData = await db("components").where("id", component_id);

  const componentName = _.snakeCase(name);

  if (fieldData[0].repeatable) {
    //if repeatable add new data
    await db(`${pageData[0].name}_${componentName}_component_data`).insert(
      data
    );
  } else {
    //if not repeatable add data if the table is empty otherwise update data dont insrt new data
    const existingRecord = await db(
      `${pageData[0].name}_${componentName}_component_data`
    ).first();
    if (existingRecord) {
      await db(`${pageData[0].name}_${componentName}_component_data`)
        .where("id", existingRecord?.id)
        .update(data);
    } else {
      await db(`${pageData[0].name}_${componentName}_component_data`).insert(
        data
      );
    }
  }

  res.send({
    message: "Data added successfully !",
  });
}

async function getPageData(req, res) {
  // try {

  const page = req?.params[0];

  //check whether a page exists in the table with name
  const pageExists = await db("pages").where("name", page).first();

  if (!pageExists) {
    return res.status(404).json({ error: "Page not found." });
  }

  const data = await queryBuilder(pageExists.uuid).findOne({
    select: ["title"],
    where: {},
  });

  res.send({ data: data });
  // } catch (error) {

  // }
}

module.exports = {
  createPage,
  addFieldsToPage,
  addPageData,
  addPageComponent,
  addDataToComponent,
  getPageData,
};

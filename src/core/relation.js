const db = require("../../database/connection");

async function addRelation(req, res) {
  const trx = await db.transaction();

  try {
    const { name, page, relatedTo, type } = req.body;

    const tableExists = await trx.schema.hasTable("relations");

    if (!tableExists) {
      await trx.schema.createTable("relations", (table) => {
        table.increments("id").primary();
        table.string("name").notNullable();
        table.string("page").notNullable();
        table.string("relatedTo").notNullable();
        table.string("type").notNullable();
      });
    }

    // Insert data into the `relations` table
    const relation = await trx("relations").insert({
      name,
      page,
      relatedTo,
      type,
    });

    if (type === "one-to-one") {
      const hasColumn = await trx.schema.hasColumn(
        `${page}_page_fields`,
        "relation_id"
      );

      if (!hasColumn) {
        await trx.schema.alterTable(`${page}_page_fields`, (table) => {
          table.integer("relation_id").unsigned().references("relations.id");
        });
      }

      await trx(`${page}_page_fields`).insert({
        name,
        type: "one-to-one",
        relation_id: relation[0],
      });

      await trx.schema.alterTable(`${page}_page_data`, (table) => {
        table
          .integer(`${relatedTo}_id`)
          .unsigned()
          .references(`${relatedTo}_page_data.id`);
      });
    } else if (type === "one-to-many") {
      await trx.schema.alterTable(`${relatedTo}_page_data`, (table) => {
        table
          .integer(`${page}_id`)
          .unsigned()
          .references(`${page}_page_data.id`);
      });

      await trx(`${page}_page_fields`).insert({
        name,
        type: "one-to-many",
        relation_id: relation[0],
      });
    } else if (type === "many-to-many") {
      const junctionTable = `${page}_${relatedTo}_relation`;
      const exists = await trx.schema.hasTable(junctionTable);

      if (!exists) {
        await trx.schema.createTable(junctionTable, (table) => {
          table.increments("id");
          table
            .integer(`${page}_id`)
            .unsigned()
            .references(`${page}_page_data.id`);
          table
            .integer(`${relatedTo}_id`)
            .unsigned()
            .references(`${relatedTo}_page_data.id`);
        });
      }

      await trx(`${page}_page_fields`).insert({
        name,
        type: "many-to-many",
        relation_id: relation[0],
      });
    }
    // add to page fields name, type and relation id
    await trx.commit();

    return res.send({ message: "Relation added successfully" });
  } catch (error) {
    await trx.rollback();
    return res
      .status(500)
      .send({ error: "Failed to add relation", details: error.message });
  }
}

module.exports = {
  addRelation,
};

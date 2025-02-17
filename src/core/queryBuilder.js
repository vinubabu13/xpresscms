const db = require("../../database/connection");

// queryBuilder.js
const queryBuilder = (table) => {
  return {
    async findOne(conditions) {
      //check whether a page exists in the table with name
      const pageExists = await db("pages").where("uuid", table).first();

      // Start building the query
      let query = db(`${pageExists.name}_page_data`);        

      // Apply SELECT conditions dynamically
      if (conditions.select) {
        query = query.select(conditions.select);
      }

      // Apply WHERE conditions dynamically
      if (conditions.where) {
        Object.keys(conditions.where).forEach((key) => {
          query = query.where(key, conditions.where[key]);
        });
      }

      // Apply ORDER BY dynamically
      if (conditions.orderBy) {
        query = query.orderBy(
          conditions.orderBy.column,
          conditions.orderBy.direction
        );
      }

      // Apply LIMIT dynamically
      if (conditions.limit) {
        query = query.limit(conditions.limit);
      }

      // Execute query
      const pageData = await query;
      return pageData;  
    },
  };
};

module.exports = queryBuilder;

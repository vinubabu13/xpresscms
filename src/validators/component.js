const { body } = require("express-validator");
const { getSnakeCasePageName, FIELD_TYPES } = require("../utility/functions");
const db = require("../../database/connection");

const createComponentRules = () => [
  body("name").custom(async (val) => {
    try {
      // Convert value to snake_case using lodash
      const pageName = getSnakeCasePageName(val);
      if (!pageName) {
        throw new Error("Invalid component name");
      }

      // Check if component already exists in the database
      const componentExist = await db("components")
        .where("name", pageName)
        .first();

      if (componentExist) {
        throw new Error("Component exists !");
      }

      return true;
    } catch (error) {
      throw new Error(error.message || "Validation error");
    }
  }),

  // Validate that 'fields' is an array with at least one element
  body("fields")
    .isArray({ min: 1 })
    .withMessage("At least one field is required"),

  // Validate each object within the 'fields' array
  body("fields.*.name").trim().notEmpty().withMessage("Field name is required"),
  body("fields.*.type")
    .trim()
    .isIn(FIELD_TYPES)
    .withMessage("Invalid field type"),
];

module.exports = { createComponentRules };

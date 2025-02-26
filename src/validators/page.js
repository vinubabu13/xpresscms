const { body } = require("express-validator");
const { getPageUid, FIELD_TYPES } = require("../utility/functions");
const db = require("../../database/connection");

const createPageRules = () => [
  body("name").custom(async (val) => {
    try {
      // Convert value to snake_case using lodash
      const pageUid = getPageUid(val);
      if (!pageUid) {
        throw new Error("Invalid component name");
      }

      // Check if component already exists in the database
      const pageExist = await db("pages").where("uuid", pageUid).first();

      if (pageExist) {
        throw new Error("Page exists !, Please choose another name.");
      }

      return true;
    } catch (error) {
      throw new Error(error.message || "Validation error");
    }
  }),
];

const addFieldsToPageRules = () => [
  body("pageUid").custom(async (val) => {
    try {
      const page = await db("pages")
        .select("name")
        .where("uuid", val)
        .first();

      if (!page) {
        throw new Error("Page doesn't exists !");
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

module.exports = { createPageRules, addFieldsToPageRules };

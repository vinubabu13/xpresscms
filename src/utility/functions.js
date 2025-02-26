const _ = require("lodash");
function getPageUid(name) {
  // Convert to lowercase, replace spaces with hyphens, and remove special characters
  const formattedName = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `api::${formattedName}.${formattedName}`;
}
function getSnakeCasePageName(name) {
  // Convert to lowercase, replace spaces with hyphens, and remove special characters
  const formattedTableName = _.snakeCase(name);

  return formattedTableName;
}
const SINGLE_PAGE = "single-type";
const MULTI_PAGE = "collection-type";

const FIELD_TYPES = [
  "string",
  "integer",
  "boolean",
  "richtext",
  "image",
  "file",
  'text',
  "component",
  "relation",
  "dynamiczone",
];

module.exports = {
  getPageUid,
  SINGLE_PAGE,
  MULTI_PAGE,
  getSnakeCasePageName,
  FIELD_TYPES
};

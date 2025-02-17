async function getPageUid(name) {
  // Convert to lowercase, replace spaces with hyphens, and remove special characters
  const formattedName = name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return `api::${formattedName}.${formattedName}`;
}
const SINGLE_PAGE = "single-type";
const MULTI_PAGE = "multi-type";

module.exports = {
  getPageUid,
  SINGLE_PAGE,
  MULTI_PAGE,
};

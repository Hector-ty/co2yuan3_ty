const { get, post } = require("../utils/request");

const listCarbonData = async (params = {}) => {
  const res = await get("/carbon-data", params);
  return res.data || {};
};

const createCarbonRecord = async (payload) => {
  const res = await post("/carbon-data", payload);
  return res.data || {};
};

module.exports = {
  listCarbonData,
  createCarbonRecord
};


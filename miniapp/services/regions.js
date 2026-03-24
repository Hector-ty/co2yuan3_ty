const { get } = require("../utils/request");

const listRegions = async () => {
  const res = await get("/regions");
  return (res.data && res.data.data) || [];
};

module.exports = {
  listRegions
};


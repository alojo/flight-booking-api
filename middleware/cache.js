const client = require("../config/redis");

/**
 * support dynamic keys eg:http://localhost:3000/api/flights?status=delayed&destination=India
 *
 * @param {*} keyFn
 * @returns
 */
const cache = (keyFn) => async (req, res, next) => {
  try {
    const key = typeof keyFn === "function" ? keyFn(req) : keyFn;
    req.cacheKey = key;
    console.log('middleware cachekey ', key)
    const cached = await client.get(key);
    if (cached) {
      return res.json({ success: true, source: "cache", ...JSON.parse(cached) });
    }
    next();
  } catch (err) {
    next();
  }
};


const invalidateCache = async (key) => {
  await client.del(key);
};

module.exports = { cache, invalidateCache };
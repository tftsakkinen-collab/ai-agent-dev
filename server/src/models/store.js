const { getStoreValue, setStoreValue } = require('../../sqlite-store');

async function readStoreList(key, memoryFallback) {
  try {
    const data = await getStoreValue(key);
    if (Array.isArray(data)) return data;
    if (data === null && memoryFallback && memoryFallback.length > 0) {
      return memoryFallback;
    }
    return [];
  } catch (e) {
    console.warn(`[db] failed to read ${key}, falling back to memory`, e.message);
    return memoryFallback;
  }
}

async function writeStoreList(key, data, memoryFallbackRef) {
  try {
    await setStoreValue(key, data);
  } catch (e) {
    console.error(`[db] failed to write ${key}`, e.message);
  }
  memoryFallbackRef.length = 0;
  memoryFallbackRef.push(...data);
}

module.exports = {
  readStoreList,
  writeStoreList,
  getStoreValue,
  setStoreValue
};

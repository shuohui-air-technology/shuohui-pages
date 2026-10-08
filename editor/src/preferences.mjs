const key = 'shuohui-writing-preferences-v1';
const defaults = { continueLists: true, pairBrackets: true };
function validate(value) {
  return Object.fromEntries(Object.entries(defaults).map(([name, fallback]) => [name, typeof value?.[name] === 'boolean' ? value[name] : fallback]));
}
export function readPreferences(storage) {
  try { return validate(JSON.parse(storage?.getItem(key) ?? 'null')); } catch { return { ...defaults }; }
}
export function writePreferences(storage, value) {
  const result = validate(value);
  try { storage?.setItem(key, JSON.stringify(result)); } catch { /* Session preferences still work without storage. */ }
  return result;
}

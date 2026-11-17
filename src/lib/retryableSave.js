// Keep the original result immutable across retries and coalesce rapid clicks.
export function retryableSave(payload, create) {
  const snapshot = structuredClone(payload);
  let pending = null;
  let saved = false;
  let result;
  return () => {
    if (saved) return Promise.resolve(result);
    if (pending) return pending;
    pending = Promise.resolve().then(() => create(structuredClone(snapshot))).then(value => {
      saved = true;
      result = value;
      return value;
    }).finally(() => { pending = null; });
    return pending;
  };
}

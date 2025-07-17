import { AsyncLocalStorage } from "node:async_hooks";

// deno-lint-ignore no-explicit-any
type Func = (...args: any[]) => any;
// deno-lint-ignore no-explicit-any
type AsyncFunction = (...args: any[]) => Promise<any>;
type MakeAsync<F extends Func> = F extends AsyncFunction ? F
  : (...args: Parameters<F>) => Promise<ReturnType<F>>;

const withContext = <T>(storage: AsyncLocalStorage<T>, context: T) =>
<F extends Func>(f: F): F =>
// @ts-expect-error cannot infer
(...xs) =>
  new Promise((resolve, reject) =>
    storage.run(context, () => {
      const result = f(...xs);
      if (result instanceof Promise) return result.then(resolve).catch(reject);
      return resolve(result);
    })
  );

export const context = <F extends Func>(fallbackFn: F) => {
  const storage = new AsyncLocalStorage<F>();
  return ({
    inject: (fn: F) => withContext(storage, fn),
    // Cannot be made point free because has to call `storage.getStore` contextually.
    access:
      ((...xs: Parameters<F>) =>
        (storage.getStore() ?? fallbackFn)(...xs)) as F extends AsyncFunction
          ? F
          : MakeAsync<F>,
  });
};

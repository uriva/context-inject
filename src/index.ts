// deno-lint-ignore no-explicit-any
type Func = (...args: any[]) => any;
// deno-lint-ignore no-explicit-any
type AsyncFunction = (...args: any[]) => Promise<any>;
type MakeAsync<F extends Func> = F extends AsyncFunction ? F
  : (...args: Parameters<F>) => Promise<ReturnType<F>>;

export type ContextStorage<T> = {
  getStore: () => T | undefined;
  run: <R>(store: T, callback: () => R) => R;
};

type AsyncLocalStorageConstructor = {
  new <T>(): ContextStorage<T>;
};

type RuntimeGlobals = {
  AsyncLocalStorage?: AsyncLocalStorageConstructor;
  process?: {
    getBuiltinModule?: (
      id: string,
    ) => { AsyncLocalStorage?: AsyncLocalStorageConstructor } | undefined;
  };
  require?: (
    id: string,
  ) => { AsyncLocalStorage?: AsyncLocalStorageConstructor } | undefined;
};

const asyncHooksModuleId = "node:async_hooks";

const resolveNativeAsyncLocalStorage = ():
  | AsyncLocalStorageConstructor
  | undefined => {
  const g = globalThis as unknown as RuntimeGlobals;
  if (typeof g.process?.getBuiltinModule === "function") {
    const mod = g.process.getBuiltinModule(asyncHooksModuleId);
    if (typeof mod?.AsyncLocalStorage === "function") {
      return mod.AsyncLocalStorage;
    }
  }
  if (typeof g.AsyncLocalStorage === "function") {
    return g.AsyncLocalStorage;
  }
  if (typeof g.require === "function") {
    try {
      const mod = g.require(asyncHooksModuleId);
      if (typeof mod?.AsyncLocalStorage === "function") {
        return mod.AsyncLocalStorage;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
};

export const createFallbackStorage = <T>(): ContextStorage<T> => {
  const holder: { current: T | undefined } = { current: undefined };
  return {
    getStore: (): T | undefined => holder.current,
    run: <R>(store: T, callback: () => R): R => {
      const previous = holder.current;
      holder.current = store;
      const restore = () => {
        holder.current = previous;
      };
      try {
        const result = callback();
        if (result instanceof Promise) {
          return result.then(
            (val) => {
              restore();
              return val;
            },
            (err) => {
              restore();
              throw err;
            },
          ) as R;
        }
        restore();
        return result;
      } catch (err) {
        restore();
        throw err;
      }
    },
  };
};

const createStorage = <T>(): ContextStorage<T> => {
  const NativeAsyncLocalStorage = resolveNativeAsyncLocalStorage();
  return NativeAsyncLocalStorage
    ? new NativeAsyncLocalStorage<T>()
    : createFallbackStorage<T>();
};

const withContext = <T>(storage: ContextStorage<T>, contextValue: T) =>
<F extends Func>(f: F): F extends AsyncFunction ? F : MakeAsync<F> =>
// @ts-expect-error cannot infer
async (...xs) => await storage.run(contextValue, () => f(...xs));

export const createContextWithStorage = <F extends Func>(
  storage: ContextStorage<F>,
  fallbackFn: F,
): Injection<F> => ({
  inject: (fn: F) => withContext(storage, fn),
  // Cannot be made point free because has to call `storage.getStore` contextually.
  access:
    ((...xs: Parameters<F>) => (storage.getStore() ?? fallbackFn)(...xs)) as F,
  getStore: () => storage.getStore() ?? fallbackFn,
});

export const context = <F extends Func>(fallbackFn: F): Injection<F> =>
  createContextWithStorage(createStorage<F>(), fallbackFn);

export type Injector = <F extends Func>(
  f: F,
) => F extends AsyncFunction ? F : MakeAsync<F>;

export type Injection<T extends Func> = {
  inject: (fn: T) => Injector;
  access: T;
  getStore: () => T;
};

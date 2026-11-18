import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  context,
  createContextWithStorage,
  createFallbackStorage,
} from "./index.ts";

Deno.test("inject and access", async () => {
  const { inject, access } = context((): string => "nothing injected");
  const withString = inject(() => "injected");
  const f = () => Promise.resolve(access());
  assertEquals(await withString(f)(), "injected");
  assertEquals(await f(), "nothing injected");
});

Deno.test("inject and access non async", async () => {
  const { inject, access } = context((): string => "nothing injected");
  const f = () => access();
  assertEquals(f(), "nothing injected");
  const withString = inject(() => "injected");
  assertEquals(await withString(f)(), "injected");
});

Deno.test("override", async () => {
  const { inject, access } = context((): string => "nothing injected");
  const withStringX = inject(() => "X");
  const withStringY = inject(() => "Y");
  const f = () => Promise.resolve(access());
  assertEquals(await withStringX(f)(), "X");
  assertEquals(await withStringY(withStringX(f))(), "X");
  assertEquals(await withStringX(withStringY(f))(), "Y");
  assertEquals(await f(), "nothing injected");
});

Deno.test("use context within context", async () => {
  const { inject: injectA, access: accessA } = context((): string =>
    "nothing injected A"
  );
  const { inject: injectB, access: accessB } = context((): string =>
    "nothing injected B"
  );
  const withA = injectA(() => "A");
  const withAB = injectB(() => accessA() + "B");
  const f = () => Promise.resolve(accessB());
  assertEquals(await withA(f)(), "nothing injected B");
  assertEquals(await withA(withAB(f))(), "AB");
  assertEquals(await f(), "nothing injected B");
});

Deno.test("async rejection preserves caller stack through composition", async () => {
  const { inject } = context((): string => "fallback");
  const withValue = inject(() => "injected");

  const innerThrower = () => Promise.reject(new Error("boom"));

  const composed = (x: string) => Promise.resolve(x).then(innerThrower);

  const outerCaller = async () => {
    const wrapped = withValue(composed);
    return await wrapped("go");
  };

  try {
    await outerCaller();
    assert(false, "should have thrown");
  } catch (e) {
    const stack = (e as Error).stack ?? "";
    assert(
      stack.includes("outerCaller"),
      `stack should include outerCaller, got:\n${stack}`,
    );
  }
});

Deno.test("sync throw inside async callback preserves caller stack", async () => {
  const { inject } = context((): string => "fallback");
  const withValue = inject(() => "injected");

  const inner = async () => {
    await Promise.resolve(1);
    throw new Error("sync-inside-async");
  };

  const outerCaller = async () => {
    const wrapped = withValue(inner);
    return await wrapped();
  };

  try {
    await outerCaller();
    assert(false, "should have thrown");
  } catch (e) {
    const stack = (e as Error).stack ?? "";
    assert(
      stack.includes("outerCaller"),
      `stack should include outerCaller, got:\n${stack}`,
    );
  }
});

Deno.test("native storage isolates concurrent async branches", async () => {
  const { inject, access } = context((): string => "default");
  const branch = (val: string, delayMs: number) =>
    inject(() => val)(async () => {
      await new Promise((r) => setTimeout(r, delayMs));
      return access();
    })();
  const [a, b] = await Promise.all([branch("first", 20), branch("second", 5)]);
  assertEquals(a, "first");
  assertEquals(b, "second");
  assertEquals(access(), "default");
});

Deno.test("browser fallback storage handles sync, async, nested overrides, and errors", async () => {
  const { inject, access, getStore } = createContextWithStorage(
    createFallbackStorage<() => string>(),
    (): string => "fallback",
  );
  assertEquals(access(), "fallback");
  assertEquals(getStore()(), "fallback");

  const withOuter = inject(() => "outer");
  const withInner = inject(() => "inner");

  const nestedResult = await withOuter(async () => {
    const before = access();
    await Promise.resolve();
    const inside = await withInner(async () => {
      await Promise.resolve();
      return access();
    })();
    const after = access();
    return [before, inside, after];
  })();

  assertEquals(nestedResult, ["outer", "inner", "outer"]);
  assertEquals(access(), "fallback");

  await assertRejects(() =>
    withOuter(async () => {
      await Promise.resolve();
      throw new Error("boom");
    })()
  );
  assertEquals(access(), "fallback");
});

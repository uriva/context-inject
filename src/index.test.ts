import { assertEquals } from "@std/assert";
import { context } from "./index.ts";

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

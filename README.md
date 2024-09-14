# context-inject

Inject values from a parent scope into child scopes.

## Motivation

Often while programming you have a need to pass in an object deep in the call
stack. It can be a singleton or a special resource, such as a database handle, a
browser for automated scraping, or just some value that you get early on and is
needed in many places.

The common way this is handled is either by passing the value down the call
stack - which is safe but highly cumbersome and results in signature duplication
(i.e. the same parameters are written along the call stack), or a global
variable is set - which is unsafe, hard to test and limits your ability to use
the same code in different contexts, or to mock the value for testing.

This library leverages the NodeJS `async_hooks` API for a better solution - you
can wrap an async function with an injector, and everything within the execution
of this function and its constituents can access the value using a global getter
function.

While the getter itself is global, the value it gets varies according to what
was injected in this specific call stack.

So you get the flexibility of a global variable, with the locality of a value
passed down a specific stack.

## Installation

node:

```
npm i async-context
```

deno:

```ts
import { context } from "https://deno.land/x/context_inject/src/index.ts";
```

## example

```ts
const { inject, access } = context((): DataBase => {
    throw new Error("not injected!");
});

const g = () => {
    // Arbitrarily complex deep nested code...
    // Suddenly you need to access the db. Great!
    const dbInstance = access();
    // Do something with it...
};

const f = () => {
    // Arbitrarily complex deep nested code...
    return g();
};

// In production

const myDb = await initDb();
const fWithDbAccess = inject(() => myDb)(f);
await fWithDbAccess();

// In your test

const myDb = await mockDbForTesting();
const fWithMockDb = inject(() => myDb)(f);
await fWithMockDb();

// If you forget to inject, it will fail clearly by throwing an error.
await f();
```

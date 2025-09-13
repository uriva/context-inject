# context-inject

Inject values from a parent scope into child scopes.

## Motivation

You have an object you need to pass into a deep call stack. It can be a
singleton or a resource, like a database, a browser for automated scraping, some
commandline flag a token for an api, or any other value that you get early and
is needed later on.

The common way to handle this is either by passing the value down the call
stack - a safe and readable approach but not too ergonomic, as it results in
signature duplication (i.e. the same parameters are written again and again
along the call stack), or using a global variable is set - which is unsafe, hard
to test (because you can't mock it for testing) and limits your ability to use
the same code in different contexts.

This library solves this problem if you're working in an async context. By
leveraging the NodeJS `async_hooks` API, it lets you wrap any async function
with an injector, and everything within the execution of this function will have
access to the value using a global getter function.

While the getter itself is global, the value it gets varies according to what
was injected in this specific call stack.

So you get the flexibility of a global variable, with the locality of a value
passed down a specific stack.

## Installation

`jsr:@uri/context-inject`

## example

```ts
type MyDatabase = {}; // Some object.

const { inject, access } = context((): MyDatabase => {
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

const myDb: MyDatabase = await initDb();
const fWithDbAccess = inject(() => myDb)(f);
await fWithDbAccess();

// In your test

const myDb: MyDatabase = await mockDbForTesting();
const fWithMockDb = inject(() => myDb)(f);
await fWithMockDb();

// If you forget to inject, you will get an explicit exception.
await f(); // throws new Error("not injected!")
```

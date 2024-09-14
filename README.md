# context-inject

Inject values from a parent scope into child scopes in async context.

## Motivation

Many times in programming you have a need to pass in an object deep in the call
stack. It can be a special resource, such as a database handle, a browser for
automated scraping, or just some value that you get early on and is needed in
many places. The general way people solve this problem is either by passing it
down the call stack - which is safe but highly cumbersome and results in
signature duplication (i.e. the same parameters are written along the call
stack), or a global variable is set - which is unsafe, hard to test and limits
your ability to use the same code in different contexts.

This library leverages the nodejs async_hooks api to create an API that allows
for a better solution - you can wrap a function with an injector, and everything
within the execution of this function and its constituents can access the value
using a global getter function. The getter is global, but the value you get is
the one you injected in this specific call stack. So you get a sort of a global
variable, with complete control of how it is injected, and you can even inject
different values in different contexts.

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

const injectDb = () => {
    const myDb = await initDb();
    return inject(() => myDb);
};

const g = () => {
    // arbitrarily complex code...
    // suddenly you need to access the db
    const dbInstance = access();
    // do something with it...
};

const f = () => {
    // arbitrarily complex code...
    return g();
};

await f(); // throws an error

await injectDb(f)();
```

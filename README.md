# async-context

Allows injecting values from a parent scope into child scopes in async context.

```
npm i async-context
```

## example

```ts
const { inject, access } = context((): string => "nothing injected");
const withString = inject(() => "injected");

const f = () => Promise.resolve(access());

await withString(f)(); // "injected"

await f(); // "nothing injected"
```

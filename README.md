Inject values from a parent scope into child scopes in async context.

node:

```
npm i async-context
```

deno:

```ts
import { context } from "https://deno.land/x/async_context/src/index.ts";
```

## example

```ts
const { inject, access } = context((): string => "nothing injected");
const withString = inject(() => "injected");

const f = () => Promise.resolve(access());

await withString(f)(); // "injected"

await f(); // "nothing injected"
```

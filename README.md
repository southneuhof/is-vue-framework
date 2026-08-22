# @southneuhof/is-vue-framework

> This repository is a read-only mirror of the package source from
> https://github.com/southneuhof/carta.
>
> Please open issues and pull requests against the Carta monorepo.

Vue components and contracts for South Neuhof web applications.

## Framework 2.0 configuration

Use one plugin options object:

```ts
app.use(FrameworkPlugin, {
  adapters,
  renderers,
  inputProps: appInputProps,
  fieldDefaults: { table: { align: 'start' } },
})
```

`fieldDefaults` define uniform surface policy. Renderer defaults and source
translation belong in `inputProps`.

## Schema and resource API

Schemas describe the standard web data contract and validation:

```ts
const schema = defineSchema({
  identity: 'id',
  record: { schema: recordSchema },
  query: { schema: querySchema },
  create: { schema: createSchema },
  update: { schema: updateSchema },
})
```

When the runtime schema is Zod, use the schema-only bridge. It infers the
parsed value, including a transform output:

```ts
const createSchema = fromZod(
  z.object({ name: z.string() }).transform(({ name }) => ({ name: name.trim() })),
)
```

Do not pass a second type argument to `fromZod`. A raw form type is local to a
real function boundary. It is not a second type for the standard resource.

Resources contain named action blocks:

```ts
const fields = defineFields(schema, {
  name: { label: 'Name', form: { renderer: 'text' } },
})

const resource = defineResource(schema, {
  key: 'records',
  actions: {
    list: { run: list, fields: [fields.name] },
    detail: { run: detail, fields: [fields.name] },
    create: { run: create, fields: [fields.name] },
    update: { run: update, fields: [fields.name] },
    delete: { run: remove },
    verify: { run: verify },
  },
})
```

Standard action objects are the View props and the only standard execution
path:

```vue
<ListView v-bind="resource.list()" />
<DetailView v-bind="resource.detail({ id })" />
<FormView v-bind="resource.create()" />
<FormView v-bind="resource.update({ id })" />
```

```ts
await resource.delete({ id }).run()
await resource.actions.verify.run(input)
```

Standard fields are schema-bound references. Define shared behavior once with
`defineFields(schema, definitions)`, use `display`, `table`, `detail`, and
`form` projections for surfaces, and select references in action order. A
terminal partial `.override({...})` handles one local difference. Custom
actions contain only `run`.

Standard create and update actions compose the existing field `context`: caller
keys remain available, then the framework writes the reserved keys `operation`
(`create` or `update`) and `permission` (the declared action permission or
`null`). Caller values cannot override the reserved keys. Field behavior reads
`context.permission` to scope relation lookups to the operation; a missing
permission in a lookup behavior is a contract error, not a fallback.

## Core components

`Table`, `Detail`, and `Form` are resource-agnostic. They accept native props
and can be used directly for custom screens. `ListView`, `DetailView`, and
`FormView` add page chrome and forward the same native props.

`Collection` owns one collection loader, query, cache identity, metadata,
loading, error, empty, and refresh state. `Table` composes `Collection` with
the table presentation. `ListView` also uses one `Collection`; without a
`#collection` slot it renders the table, and the slot's presence switches the
body to a loaded collection:

```vue
<ListView
  v-bind="resource.list()"
  :query="query"
  @update:query="query = $event"
>
  <template #collection="{ records }" v-if="view === 'grid'">
    <RouteOwnedGrid :records="records" />
  </template>
</ListView>
```

The collection slot receives presentation-safe state, query
actions, and one
`actions` object with the standard `createRoute`, `detailRoute`, `updateRoute`,
`can(operation, record)`, and `deleteRecord` callbacks from the same internal surface the
table uses. A collection presentation does not rebuild route or delete permission
checks, and it receives no loader or query client. Toggling the slot keeps
the same collection. Custom actions remain plain application functions; the
route awaits its resource invalidation after a successful action. The API
remains the final authorization boundary.

`DialogForm` composes `Dialog` with core `Form`:

```vue
<DialogForm
  v-model:open="open"
  :fields="fields"
  :submit="createRecord"
  title="Create record"
  @submitted="handleSubmitted"
>
  <template #trigger="{ setOpen }">
    <Button type="button" @click="setOpen(true)">Create</Button>
  </template>
</DialogForm>
```

Successful submission closes by default. Use `beforeClose` for Cancel and
dismiss decisions. The route owns navigation, dialogs, confirmations, and
toasts.

## Transport boundary

The framework package has no Hono source or Hono dependency. `apps/web` owns
its typed Hono contract adapter, action helper, response normalization, and
service or fetch functions.

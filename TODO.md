# TODO

## Done

- [x] Implement backend GraphQL schema (auth, menu, orders, reservations, categories)
- [x] Implement frontend GraphQL queries (`graphql/queries.ts`)
- [x] Update auth store to use `graphql-request` (`store/authStore.ts`)
- [x] Restore `App.tsx` loading overlay (`useIsFetching`/`useIsMutating`)
- [x] frontend: add specific error handling for generic errors.
- [x] admin and staff should be able to select table instead of writing table number, forms and filter bar.
- [x] Make navbar static (sticky) on top of the page
- [x] Make navbar responsive with hamburger menu on mobile

## To Do

- [x] Set up RxDB with SQLite adapter in backend
- [x] Create RxDB collections for User ...
- [ ] Refactor db config to initialize RxDB instance instead of Mongoose
- [ ] Update models to use RxDB collection methods (insert, find, update, remove)
- [ ] Modify GraphQL resolvers to query RxDB collections
- [ ] Adjust seed script to populate RxDB data
- [ ] Update Jest tests to work with RxDB (mock RxDB where needed)
- [ ] Remove Mongoose dependency and related imports
- [ ] Verify TypeScript typings for RxDB collections
- [ ] Ensure end‑to‑end functionality works with SQLite persistence
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

- [x] Refactor db config to initialize RxDB instance instead of Mongoose
- [x] Update models to use RxDB collection methods (insert, find, update, remove)
- [x] Modify GraphQL resolvers to query RxDB collections
- [x] Adjust seed script to populate RxDB data
- [x] Update Jest tests to work with RxDB (mock RxDB where needed)
- [x] Make table number required when creating a new order (frontend and backend)

## To Do

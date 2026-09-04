# TODO

## Main Task

- [x] Replace MongoDB with RxDB and persist data on SQLite

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
- [x] Create RxDB collections for User ...
- [x] Refactor db config to initialize RxDB instance instead of Mongoose
- [x] Update models to use RxDB collection methods (insert, find, update, remove)
- [x] Modify GraphQL resolvers to query RxDB collections
- [x] Adjust seed script to populate RxDB data
- [x] Update Jest tests to work with RxDB (mock RxDB where needed)
- [x] Fix auth resolver tests (bcrypt mock & userDoc.toJSON)
- [x] Fix category and settings resolver tests (mock RxDB getDB correctly)
- [x] Remove Mongoose dependency and related imports
- [x] Verify TypeScript typings for RxDB collections
- [x] Ensure end-to-end functionality works with SQLite persistence
- [x] Clean up package.json (remove mongoose, add rxdb deps)
- [x] Update documentation for new persistence layer

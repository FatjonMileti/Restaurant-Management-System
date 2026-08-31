# TODO

## Done
- [x] Implement backend GraphQL schema (auth, menu, orders, reservations, categories)
- [x] Replace broken `graphql-http` import with `express-graphql`
- [x] Fix `express-graphql` `formatError` compatibility with graphql v17
- [x] Fix order/item `Buffer` serialization (`lean` + manual mapping for embedded refs)
- [x] Implement frontend GraphQL queries (`graphql/queries.ts`)
- [x] Replace React Query hooks with TanStack + `graphql-request` (`api/queries.ts`)
- [x] Update auth store to use `graphql-request` (`store/authStore.ts`)
- [x] Restore `App.tsx` loading overlay (`useIsFetching`/`useIsMutating`)

## To Do
- [ ] Remove debug `console.log('DEBUG orders user: ...')` from backend server
- [ ] End-to-end QA: verify auth, menu CRUD, orders, reservations via `/graphql`

# TODO

## Done
- [x] Implement backend GraphQL schema (auth, menu, orders, reservations, categories)
- [x] Replace broken `graphql-http` import with `express-graphql`
- [x] Fix `express-graphql` `formatError` compatibility with graphql v17
- [x] Fix order/item `Buffer` serialization (`lean` + manual mapping for embedded refs)
- [x] Implement frontend Apollo Client (`graphql/client.ts`) with auth header link
- [x] Write frontend GraphQL queries/mutations (`graphql/queries.ts`)
- [x] Replace React Query hooks with Apollo `useQuery`/`useMutation` (`api/queries.ts`)
- [x] Update auth store to use GraphQL mutations (`store/authStore.ts`)
- [x] Clean `App.tsx` from TanStack Query references

## To Do
- [ ] Remove debug `console.log('DEBUG orders user: ...')` from backend server
- [ ] End-to-end QA: verify auth, menu CRUD, orders, reservations via `/graphql`
- [ ] Ensure frontend pages work with new Apollo hooks and mapped `id`/`_id` fields

# TODO

## Done

- [x] Implement backend GraphQL schema (auth, menu, orders, reservations, categories)
- [x] Implement frontend GraphQL queries (`graphql/queries.ts`)
- [x] Update auth store to use `graphql-request` (`store/authStore.ts`)
- [x] Restore `App.tsx` loading overlay (`useIsFetching`/`useIsMutating`)
- [x] frontend: add specific error handling for generic errors.
- [x] admin and staff should be able to select table instead of writing table number, forms and filter bar.

## To Do

- [x] Dashboard page - create a graphql endpoint on backend to get only necessary dashboard data and use them on dashboard page.
- [x] After that optimize the hole app.
- [x] className="flex justify-between items-center mb-2" is repeated in many places, create a component for it.
- [x] frontend: refactor and split components into smaller, more manageable pieces.
- [x] backend/graphql/schema.ts: refactor and split into smaller, more manageable pieces.
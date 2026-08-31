# TODO

## Done
- [x] Implement backend GraphQL schema (auth, menu, orders, reservations, categories)
- [x] Implement frontend GraphQL queries (`graphql/queries.ts`)
- [x] Update auth store to use `graphql-request` (`store/authStore.ts`)
- [x] Restore `App.tsx` loading overlay (`useIsFetching`/`useIsMutating`)
- [x] frontend: add specific error handling for generic errors

## To Do

- [x] Menu page - remove add item button when user is logged out, only admin can add and edit items
- [x] Settings page - add restorant details section where admin can add and edit restorant name, logo, address, phone, email and how many tables restorant has.
- [x] Navbar - add restorant details to navbar.
- [x] Reservations page - aadmin and staff should be able to change reservation status.
- [x] Add new page where admin and staff can see free and busy tables.
- [x] admin and staff should be able to select table instead of writing table number, forms and filter bar.

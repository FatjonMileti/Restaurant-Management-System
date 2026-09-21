export const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    role: String!
    phone: String
    createdAt: String
    updatedAt: String
  }

  type MenuItem {
    id: ID!
    name: String!
    description: String
    price: Float!
    category: String!
    image: String
    available: Boolean!
    createdAt: String
    updatedAt: String
  }

  type Category {
    id: ID!
    name: String!
    createdAt: String
    updatedAt: String
  }

  type OrderItem {
    menuItem: MenuItem
    name: String!
    quantity: Int!
    price: Float!
  }

  type Order {
    id: ID!
    user: User
    items: [OrderItem!]!
    totalAmount: Float!
    status: String!
    tableNumber: Int
    paymentMethod: String!
    createdAt: String
    updatedAt: String
  }

  type Reservation {
    id: ID!
    user: User
    date: String!
    time: String!
    guests: Int!
    tableNumber: Int
    status: String!
    specialRequests: String
    clientName: String
    clientPhone: String
    clientEmail: String
    createdAt: String
    updatedAt: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  input OrderItemInput {
    menuItem: ID!
    name: String!
    quantity: Int!
    price: Float!
  }

  input ReservationInput {
    date: String!
    time: String!
    guests: Int!
    tableNumber: Int
    specialRequests: String
    clientName: String
    clientPhone: String
    clientEmail: String
  }

  type RestaurantSettings {
    id: ID!
    name: String!
    logo: String
    address: String
    phone: String
    email: String
    tableCount: Int!
    createdAt: String
    updatedAt: String
  }

  type TableStatus {
    number: Int!
    isBusy: Boolean!
    busyType: String
    occupiedBy: String
  }

  type StatusCount {
    status: String!
    count: Int!
  }

  type ActivityLog {
    id: ID!
    actorId: String
    actorName: String
    actorRole: String
    action: String!
    entity: String!
    entityId: String
    summary: String!
    createdAt: String
  }

  type DashboardStats {
    totalOrders: Int!
    pendingOrders: Int!
    preparingOrders: Int!
    completedOrders: Int!
    cancelledOrders: Int!
    totalReservations: Int!
    confirmedReservations: Int!
    completedReservations: Int!
    cancelledReservations: Int!
    totalMenuItems: Int!
    availableMenuItems: Int!
    totalUsers: Int!
    totalCategories: Int!
    totalTables: Int!
    busyTables: Int!
    freeTables: Int!
    totalRevenue: Float!
    todayOrders: Int!
    todayReservations: Int!
    recentOrders: [Order!]!
    ordersByStatus: [StatusCount!]!
    reservationsByStatus: [StatusCount!]!
  }

  type Query {
    hello: String

    authMe: User
    authUsers: [User!]!

    menuItems(category: String, available: Boolean, limit: Int, offset: Int): [MenuItem!]!
    menuItem(id: ID!): MenuItem

    orders(status: String, tableNumber: Int, limit: Int, offset: Int): [Order!]!
    order(id: ID!): Order

    reservations(status: String, tableNumber: Int, limit: Int, offset: Int): [Reservation!]!
    reservation(id: ID!): Reservation

    activityLogs(entity: String, action: String, search: String, limit: Int, offset: Int): [ActivityLog!]!
    activityLogCount(entity: String, action: String, search: String): Int!

    categories: [Category!]!
    category(id: ID!): Category

    restaurantSettings: RestaurantSettings
    tables: [TableStatus!]!
    dashboardStats: DashboardStats!
  }

  type Mutation {
    register(name: String!, email: String!, password: String!, phone: String): AuthPayload
    login(email: String!, password: String!): AuthPayload

    createMenuItem(name: String!, description: String, price: Float!, category: String!, image: String): MenuItem
    updateMenuItem(id: ID!, name: String, description: String, price: Float, category: String, image: String, available: Boolean): MenuItem
    deleteMenuItem(id: ID!): String

    createOrder(items: [OrderItemInput!]!, tableNumber: Int!, paymentMethod: String): Order
    updateOrder(id: ID!, items: [OrderItemInput!], tableNumber: Int, paymentMethod: String, status: String, totalAmount: Float): Order
    deleteOrder(id: ID!): String
    updateOrderStatus(id: ID!, status: String!): Order

    createReservation(date: String!, time: String!, guests: Int!, tableNumber: Int, specialRequests: String, clientName: String, clientPhone: String, clientEmail: String): Reservation
    updateReservation(id: ID!, date: String, time: String, guests: Int, tableNumber: Int, status: String, specialRequests: String, clientName: String, clientPhone: String, clientEmail: String): Reservation
    deleteReservation(id: ID!): String
    cancelReservation(id: ID!): Reservation

    createCategory(name: String!): Category
    updateCategory(id: ID!, name: String!): Category
    deleteCategory(id: ID!): String

    createUserByAdmin(name: String!, email: String!, password: String!, phone: String, role: String): User
    updateUserRole(id: ID!, role: String!): User
    updateUser(id: ID!, name: String, email: String, phone: String, role: String): User
    adminUpdateUserPassword(id: ID!, password: String!): String
    deleteUser(id: ID!): String

    updateRestaurantSettings(name: String, logo: String, address: String, phone: String, email: String, tableCount: Int): RestaurantSettings

    clearActivityLogs: String
  }
`;

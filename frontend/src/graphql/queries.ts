import { gql } from '@apollo/client';

export const HELLO = gql`
  query Hello {
    hello
  }
`;

export const GET_CATEGORIES = gql`
  query GetCategories {
    categories {
      id
      name
    }
  }
`;
export const CREATE_CATEGORY = gql`
  mutation CreateCategory($name: String!) {
    createCategory(name: $name) {
      id
      name
    }
  }
`;
export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory($id: ID!, $name: String!) {
    updateCategory(id: $id, name: $name) {
      id
      name
    }
  }
`;
export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: ID!) {
    deleteCategory(id: $id)
  }
`;

export const GET_MENU_ITEMS = gql`
  query GetMenuItems($category: String, $available: Boolean) {
    menuItems(category: $category, available: $available) {
      id
      name
      description
      price
      category
      image
      available
    }
  }
`;
export const GET_MENU_ITEM = gql`
  query GetMenuItem($id: ID!) {
    menuItem(id: $id) {
      id
      name
      description
      price
      category
      image
      available
    }
  }
`;
export const CREATE_MENU_ITEM = gql`
  mutation CreateMenuItem(
    $name: String!
    $description: String
    $price: Float!
    $category: String!
    $image: String
  ) {
    createMenuItem(
      name: $name
      description: $description
      price: $price
      category: $category
      image: $image
    ) {
      id
      name
      description
      price
      category
      image
      available
    }
  }
`;
export const UPDATE_MENU_ITEM = gql`
  mutation UpdateMenuItem(
    $id: ID!
    $name: String
    $description: String
    $price: Float
    $category: String
    $image: String
    $available: Boolean
  ) {
    updateMenuItem(
      id: $id
      name: $name
      description: $description
      price: $price
      category: $category
      image: $image
      available: $available
    ) {
      id
      name
      description
      price
      category
      image
      available
    }
  }
`;
export const DELETE_MENU_ITEM = gql`
  mutation DeleteMenuItem($id: ID!) {
    deleteMenuItem(id: $id)
  }
`;

export const GET_ORDERS = gql`
  query GetOrders($status: String, $tableNumber: Int) {
    orders(status: $status, tableNumber: $tableNumber) {
      id
      user {
        id
        name
        email
      }
      items {
        menuItem {
          id
          name
        }
        name
        quantity
        price
      }
      totalAmount
      status
      tableNumber
      paymentMethod
      createdAt
    }
  }
`;
export const GET_ORDER = gql`
  query GetOrder($id: ID!) {
    order(id: $id) {
      id
      user {
        id
        name
        email
      }
      items {
        menuItem {
          id
          name
        }
        name
        quantity
        price
      }
      totalAmount
      status
      tableNumber
      paymentMethod
      createdAt
    }
  }
`;
export const CREATE_ORDER = gql`
  mutation CreateOrder($items: [OrderItemInput!]!, $tableNumber: Int, $paymentMethod: String) {
    createOrder(items: $items, tableNumber: $tableNumber, paymentMethod: $paymentMethod) {
      id
      totalAmount
      status
    }
  }
`;
export const UPDATE_ORDER = gql`
  mutation UpdateOrder(
    $id: ID!
    $items: [OrderItemInput!]
    $tableNumber: Int
    $paymentMethod: String
    $status: String
    $totalAmount: Float
  ) {
    updateOrder(
      id: $id
      items: $items
      tableNumber: $tableNumber
      paymentMethod: $paymentMethod
      status: $status
      totalAmount: $totalAmount
    ) {
      id
      totalAmount
      status
    }
  }
`;
export const DELETE_ORDER = gql`
  mutation DeleteOrder($id: ID!) {
    deleteOrder(id: $id)
  }
`;
export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($id: ID!, $status: String!) {
    updateOrderStatus(id: $id, status: $status) {
      id
      status
    }
  }
`;

export const GET_RESERVATIONS = gql`
  query GetReservations($status: String, $tableNumber: Int) {
    reservations(status: $status, tableNumber: $tableNumber) {
      id
      user {
        id
        name
        email
      }
      date
      time
      guests
      tableNumber
      status
      specialRequests
      createdAt
    }
  }
`;
export const GET_RESERVATION = gql`
  query GetReservation($id: ID!) {
    reservation(id: $id) {
      id
      user {
        id
        name
        email
      }
      date
      time
      guests
      tableNumber
      status
      specialRequests
      createdAt
    }
  }
`;
export const CREATE_RESERVATION = gql`
  mutation CreateReservation(
    $date: String!
    $time: String!
    $guests: Int!
    $tableNumber: Int
    $specialRequests: String
  ) {
    createReservation(
      date: $date
      time: $time
      guests: $guests
      tableNumber: $tableNumber
      specialRequests: $specialRequests
    ) {
      id
      status
    }
  }
`;
export const UPDATE_RESERVATION = gql`
  mutation UpdateReservation(
    $id: ID!
    $date: String
    $time: String
    $guests: Int
    $tableNumber: Int
    $status: String
    $specialRequests: String
  ) {
    updateReservation(
      id: $id
      date: $date
      time: $time
      guests: $guests
      tableNumber: $tableNumber
      status: $status
      specialRequests: $specialRequests
    ) {
      id
      status
    }
  }
`;
export const DELETE_RESERVATION = gql`
  mutation DeleteReservation($id: ID!) {
    deleteReservation(id: $id)
  }
`;
export const CANCEL_RESERVATION = gql`
  mutation CancelReservation($id: ID!) {
    cancelReservation(id: $id) {
      id
      status
    }
  }
`;

export const GET_USERS = gql`
  query GetUsers {
    authUsers {
      id
      name
      email
      role
      phone
    }
  }
`;
export const CREATE_USER = gql`
  mutation CreateUser(
    $name: String!
    $email: String!
    $password: String!
    $phone: String
    $role: String
  ) {
    createUserByAdmin(name: $name, email: $email, password: $password, phone: $phone, role: $role) {
      id
      name
      email
      role
    }
  }
`;
export const UPDATE_USER_ROLE = gql`
  mutation UpdateUserRole($id: ID!, $role: String!) {
    updateUserRole(id: $id, role: $role) {
      id
      role
    }
  }
`;
export const DELETE_USER = gql`
  mutation DeleteUser($id: ID!) {
    deleteUser(id: $id)
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;
export const REGISTER = gql`
  mutation Register($name: String!, $email: String!, $password: String!, $phone: String) {
    register(name: $name, email: $email, password: $password, phone: $phone) {
      token
      user {
        id
        name
        email
        role
      }
    }
  }
`;
export const ME = gql`
  query Me {
    authMe {
      id
      name
      email
      role
    }
  }
`;

export const GET_RESTAURANT_SETTINGS = gql`
  query GetRestaurantSettings {
    restaurantSettings {
      id
      name
      logo
      address
      phone
      email
      tableCount
    }
  }
`;
export const UPDATE_RESTAURANT_SETTINGS = gql`
  mutation UpdateRestaurantSettings(
    $name: String
    $logo: String
    $address: String
    $phone: String
    $email: String
    $tableCount: Int
  ) {
    updateRestaurantSettings(
      name: $name
      logo: $logo
      address: $address
      phone: $phone
      email: $email
      tableCount: $tableCount
    ) {
      id
      name
      logo
      address
      phone
      email
      tableCount
    }
  }
`;
export const GET_TABLES = gql`
  query GetTables {
    tables {
      number
      isBusy
      busyType
      occupiedBy
    }
  }
`;
export const GET_DASHBOARD_STATS = gql`
  query GetDashboardStats {
    dashboardStats {
      totalOrders
      pendingOrders
      preparingOrders
      completedOrders
      cancelledOrders
      totalReservations
      confirmedReservations
      completedReservations
      cancelledReservations
      totalMenuItems
      availableMenuItems
      totalUsers
      totalCategories
      totalTables
      busyTables
      freeTables
      totalRevenue
      todayOrders
      todayReservations
      recentOrders {
        id
        totalAmount
        status
        tableNumber
        createdAt
        user {
          name
        }
        items {
          name
          quantity
          price
        }
      }
      ordersByStatus {
        status
        count
      }
      reservationsByStatus {
        status
        count
      }
    }
  }
`;

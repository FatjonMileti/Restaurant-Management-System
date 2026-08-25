import swaggerJSDoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Restaurant Management API',
      version: '1.0.0',
      description: 'API documentation for the Restaurant Management System',
      contact: {
        name: 'Restaurant Admin',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['customer', 'staff', 'admin'] },
            phone: { type: 'string' },
          },
        },
        MenuItem: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            category: { type: 'string', enum: ['appetizer', 'main', 'dessert', 'beverage'] },
            image: { type: 'string' },
            available: { type: 'boolean' },
          },
        },
        OrderItem: {
          type: 'object',
          properties: {
            menuItem: { type: 'string' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            totalAmount: { type: 'number' },
            status: { type: 'string', enum: ['pending', 'preparing', 'completed', 'cancelled'] },
            tableNumber: { type: 'integer' },
            paymentMethod: { type: 'string', enum: ['cash', 'card'] },
          },
        },
        Reservation: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            time: { type: 'string' },
            guests: { type: 'integer' },
            tableNumber: { type: 'integer' },
            status: { type: 'string', enum: ['confirmed', 'cancelled', 'completed'] },
            specialRequests: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./routes/*.ts', './controllers/*.ts'],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;

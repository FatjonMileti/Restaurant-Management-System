import { graphqlHTTP } from 'express-graphql';
import { schema, root } from './graphql/schema.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUI from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import connectDB from './config/db.js';
import authRoutes from './routes/auth.js';
import menuRoutes from './routes/menu.js';
import orderRoutes from './routes/orders.js';
import reservationRoutes from './routes/reservations.js';
import categoryRoutes from './routes/category.js';
import jwt from 'jsonwebtoken';
import { initSocket } from './socket.js';

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// app.use('/api/auth', authRoutes);
// app.use('/api/menu', menuRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/reservations', reservationRoutes);
// app.use('/api/categories', categoryRoutes);

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

app.use(
  '/graphql',
  graphqlHTTP((req) => {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let userId: string | undefined;
    if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
        userId = decoded.id;
      } catch {
        userId = undefined;
      }
    }
    return {
      schema,
      rootValue: root,
      context: { userId },
      graphiql: true,
      formatError: (err: any) => ({
        message: err.message || 'Unknown error',
        path: err.path,
        locations: err.locations,
      }),
    };
  }),
);

app.get('/', (_req, res) => {
  res.send('Restaurant Management API is running...');
});

const PORT = process.env.PORT || 5000;
const httpServer = app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
initSocket(httpServer);

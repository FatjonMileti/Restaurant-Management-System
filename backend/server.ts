import { graphqlHTTP } from 'express-graphql';
import { schema, root } from './graphql/schema.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import morgan from 'morgan';
import swaggerUI from 'swagger-ui-express';
import swaggerSpec from './swagger.js';
import connectDB from './config/db.js';
import jwt from 'jsonwebtoken';
import { initSSE } from './sse.js';
import { formatGraphQLError } from './graphql/errors.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));

// Serve backend images (menu photos, restaurant logo). The folder resolves
// differently under tsx (backend/) vs compiled output (backend/dist/),
// so pick the first candidate that exists.
const imagesDirCandidates = [
  path.join(__dirname, 'public', 'images'),
  path.join(__dirname, '..', 'public', 'images'),
];
const imagesDir = imagesDirCandidates.find((dir) => fs.existsSync(dir)) ?? imagesDirCandidates[0];
app.use('/images', express.static(imagesDir));

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
      customFormatErrorFn: formatGraphQLError,
    };
  }),
);

app.get('/', (_req, res) => {
  res.send('Restaurant Management API is running...');
});

initSSE(app);

const PORT = process.env.PORT || 5000;

// Wait for the database before accepting requests — resolvers throw a clear
// "Database not initialized" error otherwise, and early requests would fail.
const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();

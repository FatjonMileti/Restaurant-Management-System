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
import { seed } from './seeds.js';

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

// Serve frontend build for demonstration / single-origin deploy.
// `npm run build:frontend` (root) moves the build to backend/public/build;
// the folder resolves differently under tsx (backend/) vs compiled
// output (backend/dist/), so pick the first candidate with an index.html
// (frontend/build kept as fallback for plain `npm run build` in frontend/).
const frontendBuildCandidates = [
  path.join(__dirname, 'public', 'build'),
  path.join(__dirname, '..', 'public', 'build'),
  path.join(__dirname, '..', 'frontend', 'build'),
  path.join(__dirname, '..', '..', 'frontend', 'build'),
];
const frontendBuildDir = frontendBuildCandidates.find((dir) =>
  fs.existsSync(path.join(dir, 'index.html')),
);
if (frontendBuildDir) {
  app.use(express.static(frontendBuildDir));
}

app.get('/', (_req, res) => {
  if (frontendBuildDir) {
    res.sendFile(path.join(frontendBuildDir, 'index.html'));
    return;
  }
  res.send('Restaurant Management API is running...');
});

// Only for local development - seed the database
app.get('/seed', async (_req, res) => {
  await seed();
  res.send('Database seeded successfully');
});

initSSE(app);

// SPA fallback for React Router — serves index.html for any non-API GET.
// Must come after /graphql, /events, /images, /api-docs and /seed.
if (frontendBuildDir) {
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/graphql') ||
      req.path.startsWith('/events') ||
      req.path.startsWith('/images') ||
      req.path.startsWith('/api-docs') ||
      req.path.startsWith('/seed')
    ) {
      next();
      return;
    }
    res.sendFile(path.join(frontendBuildDir as string, 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

// Wait for the database before accepting requests — resolvers throw a clear
// "Database not initialized" error otherwise, and early requests would fail.
const start = async () => {
  await connectDB();
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
};

start();

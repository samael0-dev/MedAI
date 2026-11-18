import http from 'http';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth';

const PORT = process.env.AUTH_PORT ? parseInt(process.env.AUTH_PORT) : 4000;
const server = http.createServer(toNodeHandler(auth));

server.listen(PORT, () => {
  console.log(`[Better Auth Server] Clinical Auth Microservice running at http://localhost:${PORT}`);
  console.log(`[Better Auth Server] Endpoints active: Google OAuth, Email OTP, JWT Tokens, SQLite Adapter`);
});

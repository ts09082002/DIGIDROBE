/**
 * Firebase Auth Middleware
 *
 * Verifies the Firebase Bearer token on every incoming request.
 * Attaches the decoded token to req.user for downstream use.
 *
 * Apply this globally in AppModule via configure(consumer).
 */

import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { getFirebaseAdmin } from '../firebase-admin';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; email?: string };
}

@Injectable()
export class FirebaseAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(FirebaseAuthMiddleware.name);

  async use(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.split('Bearer ')[1];

    try {
      const decoded = await getFirebaseAdmin().auth().verifyIdToken(token);
      req.user = { uid: decoded.uid, email: decoded.email };
      next();
    } catch (err) {
      this.logger.warn(`Auth token verification failed: ${err.code ?? 'unknown'}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

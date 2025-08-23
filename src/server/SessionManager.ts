import { randomUUID } from 'crypto';
import { createComponentLogger } from '../utils/logger.js';

const logger = createComponentLogger('SESSION_MANAGER');

export interface Session {
  id: string;
  clientId: string;
  createdAt: number;
  lastActivity: number;
  state: Record<string, unknown>;
  capabilities: string[];
  isActive: boolean;
}

export interface ISessionManager {
  createSession(clientId: string): Promise<Session>;
  getSession(sessionId: string): Session | null;
  updateSession(sessionId: string, data: Partial<Session>): void;
  closeSession(sessionId: string): Promise<void>;
  listActiveSessions(): Session[];
  cleanup(): Promise<void>;
  getHealthStatus(): {
    healthy: boolean;
    totalSessions: number;
    activeSessions: number;
    oldestSessionAge: number | null;
  };
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    sessionsCreatedLastHour: number;
  };
}

export class SessionManager implements ISessionManager {
  private sessions = new Map<string, Session>();
  private cleanupInterval: NodeJS.Timeout;
  private readonly sessionTimeoutMs: number;

  constructor(sessionTimeoutMs: number = 30 * 60 * 1000) {
    // 30 minutes default
    this.sessionTimeoutMs = sessionTimeoutMs;

    // Start cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(
      () => {
        this.cleanupExpiredSessions();
      },
      5 * 60 * 1000
    );

    logger.info('SessionManager initialized', {
      session_timeout_ms: this.sessionTimeoutMs,
    });
  }

  async createSession(clientId: string): Promise<Session> {
    const sessionId = randomUUID();
    const now = Date.now();

    const session: Session = {
      id: sessionId,
      clientId,
      createdAt: now,
      lastActivity: now,
      state: {},
      capabilities: [],
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    logger.info('Session created', {
      session_id: sessionId,
      client_id: clientId,
      total_sessions: this.sessions.size,
    });

    return session;
  }

  getSession(sessionId: string): Session | null {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.debug('Session not found', { session_id: sessionId });
      return null;
    }

    if (!session.isActive) {
      logger.debug('Session is inactive', { session_id: sessionId });
      return null;
    }

    // Check if session has expired
    if (Date.now() - session.lastActivity > this.sessionTimeoutMs) {
      logger.info('Session expired', {
        session_id: sessionId,
        last_activity: new Date(session.lastActivity).toISOString(),
      });
      this.sessions.delete(sessionId);
      return null;
    }

    // Update last activity
    session.lastActivity = Date.now();
    return session;
  }

  updateSession(sessionId: string, data: Partial<Session>): void {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.warn('Attempted to update non-existent session', {
        session_id: sessionId,
      });
      return;
    }

    // Don't allow updating certain protected fields
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, clientId, createdAt, ...updateData } = data;

    Object.assign(session, updateData);
    session.lastActivity = Date.now();

    logger.debug('Session updated', {
      session_id: sessionId,
      updated_fields: Object.keys(updateData),
    });
  }

  async closeSession(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);

    if (!session) {
      logger.debug('Session not found for closing', { session_id: sessionId });
      return;
    }

    session.isActive = false;
    session.lastActivity = Date.now();

    // Remove session after a brief delay to allow for cleanup
    setTimeout(() => {
      this.sessions.delete(sessionId);
      logger.info('Session removed from memory', { session_id: sessionId });
    }, 5000);

    logger.info('Session closed', {
      session_id: sessionId,
      duration_ms: Date.now() - session.createdAt,
      total_sessions: this.sessions.size,
    });
  }

  listActiveSessions(): Session[] {
    const now = Date.now();
    const activeSessions = Array.from(this.sessions.values()).filter(
      (session) => session.isActive && now - session.lastActivity <= this.sessionTimeoutMs
    );

    logger.debug('Active sessions listed', {
      active_count: activeSessions.length,
      total_count: this.sessions.size,
    });

    return activeSessions;
  }

  private cleanupExpiredSessions(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (!session.isActive || now - session.lastActivity > this.sessionTimeoutMs) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.sessions.delete(sessionId);
    }

    if (expiredSessions.length > 0) {
      logger.info('Cleanup completed', {
        expired_sessions: expiredSessions.length,
        remaining_sessions: this.sessions.size,
      });
    }
  }

  async cleanup(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Close all active sessions
    const activeSessions = this.listActiveSessions();
    await Promise.all(activeSessions.map((session) => this.closeSession(session.id)));

    this.sessions.clear();

    logger.info('SessionManager cleanup completed');
  }

  // Health check method
  getHealthStatus(): {
    healthy: boolean;
    totalSessions: number;
    activeSessions: number;
    oldestSessionAge: number | null;
  } {
    const now = Date.now();
    const activeSessions = this.listActiveSessions();

    let oldestSessionAge: number | null = null;
    if (activeSessions.length > 0) {
      oldestSessionAge = Math.min(...activeSessions.map((session) => now - session.createdAt));
    }

    const healthy = this.sessions.size < 1000; // Consider unhealthy if too many sessions

    return {
      healthy,
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      oldestSessionAge,
    };
  }

  // Get session statistics
  getStatistics(): {
    totalSessions: number;
    activeSessions: number;
    averageSessionDuration: number;
    sessionsCreatedLastHour: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const activeSessions = this.listActiveSessions();

    const averageSessionDuration =
      activeSessions.length > 0
        ? activeSessions.reduce((sum, session) => sum + (now - session.createdAt), 0) /
          activeSessions.length
        : 0;

    const sessionsCreatedLastHour = Array.from(this.sessions.values()).filter(
      (session) => session.createdAt > oneHourAgo
    ).length;

    return {
      totalSessions: this.sessions.size,
      activeSessions: activeSessions.length,
      averageSessionDuration,
      sessionsCreatedLastHour,
    };
  }
}

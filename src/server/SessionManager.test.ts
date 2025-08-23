import { SessionManager } from './SessionManager.js';

describe('SessionManager', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager(1000); // 1 second timeout for testing
  });

  afterEach(async () => {
    await sessionManager.cleanup();
  });

  describe('createSession', () => {
    it('should create a session with unique ID', async () => {
      const session = await sessionManager.createSession('client-1');

      expect(session.id).toBeDefined();
      expect(session.clientId).toBe('client-1');
      expect(session.createdAt).toBeDefined();
      expect(session.lastActivity).toBeDefined();
      expect(session.state).toEqual({});
      expect(session.capabilities).toEqual([]);
      expect(session.isActive).toBe(true);
    });

    it('should create sessions with different IDs', async () => {
      const session1 = await sessionManager.createSession('client-1');
      const session2 = await sessionManager.createSession('client-2');

      expect(session1.id).not.toBe(session2.id);
    });
  });

  describe('getSession', () => {
    it('should retrieve existing session', async () => {
      const created = await sessionManager.createSession('client-1');
      const retrieved = sessionManager.getSession(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved).not.toBeNull();
      expect(retrieved!.id).toBe(created.id);
      expect(retrieved!.clientId).toBe('client-1');
    });

    it('should return null for non-existent session', () => {
      const session = sessionManager.getSession('non-existent');
      expect(session).toBeNull();
    });

    it('should update lastActivity when retrieving session', async () => {
      const created = await sessionManager.createSession('client-1');
      const originalActivity = created.lastActivity;

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = sessionManager.getSession(created.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.lastActivity).toBeGreaterThan(originalActivity);
    });

    it('should return null for expired session', async () => {
      const created = await sessionManager.createSession('client-1');

      // Wait for session to expire
      await new Promise(resolve => setTimeout(resolve, 1100));

      const retrieved = sessionManager.getSession(created.id);
      expect(retrieved).toBeNull();
    });

    it('should return null for inactive session', async () => {
      const created = await sessionManager.createSession('client-1');
      await sessionManager.closeSession(created.id);

      const retrieved = sessionManager.getSession(created.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session data', async () => {
      const session = await sessionManager.createSession('client-1');
      
      sessionManager.updateSession(session.id, {
        state: { key: 'value' },
        capabilities: ['test'],
      });

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.state).toEqual({ key: 'value' });
      expect(retrieved!.capabilities).toEqual(['test']);
    });

    it('should not update protected fields', async () => {
      const session = await sessionManager.createSession('client-1');
      const originalId = session.id;
      const originalClientId = session.clientId;
      const originalCreatedAt = session.createdAt;

      sessionManager.updateSession(session.id, {
        id: 'new-id',
        clientId: 'new-client',
        createdAt: 999999,
      } as any);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).not.toBeNull();
      if (retrieved) {
        expect(retrieved.id).toBe(originalId);
        expect(retrieved.clientId).toBe(originalClientId);
        expect(retrieved.createdAt).toBe(originalCreatedAt);
      }
    });

    it('should handle non-existent session gracefully', () => {
      expect(() => {
        sessionManager.updateSession('non-existent', { state: { key: 'value' } });
      }).not.toThrow();
    });
  });

  describe('closeSession', () => {
    it('should mark session as inactive', async () => {
      const session = await sessionManager.createSession('client-1');
      await sessionManager.closeSession(session.id);

      const retrieved = sessionManager.getSession(session.id);
      expect(retrieved).toBeNull();
    });

    it('should handle non-existent session gracefully', async () => {
      await expect(sessionManager.closeSession('non-existent')).resolves.not.toThrow();
    });
  });

  describe('listActiveSessions', () => {
    it('should return active sessions', async () => {
      const session1 = await sessionManager.createSession('client-1');
      const session2 = await sessionManager.createSession('client-2');

      const active = sessionManager.listActiveSessions();
      expect(active).toHaveLength(2);
      expect(active.map(s => s.id)).toContain(session1.id);
      expect(active.map(s => s.id)).toContain(session2.id);
    });

    it('should not return inactive sessions', async () => {
      const session1 = await sessionManager.createSession('client-1');
      const session2 = await sessionManager.createSession('client-2');

      await sessionManager.closeSession(session1.id);

      const active = sessionManager.listActiveSessions();
      expect(active).toHaveLength(1);
      expect(active[0]?.id).toBe(session2.id);
    });

    it('should not return expired sessions', async () => {
      await sessionManager.createSession('client-1');

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      const active = sessionManager.listActiveSessions();
      expect(active).toHaveLength(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', async () => {
      await sessionManager.createSession('client-1');
      const health = sessionManager.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.totalSessions).toBe(1);
      expect(health.activeSessions).toBe(1);
      expect(health.oldestSessionAge).toBeGreaterThan(0);
    });

    it('should report unhealthy with too many sessions', async () => {
      // Mock many sessions by directly manipulating the internal state
      for (let i = 0; i < 1001; i++) {
        await sessionManager.createSession(`client-${i}`);
      }

      const health = sessionManager.getHealthStatus();
      expect(health.healthy).toBe(false);
      expect(health.totalSessions).toBe(1001);
    });
  });

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      await sessionManager.createSession('client-1');
      
      // Wait a bit for duration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const stats = sessionManager.getStatistics();

      expect(stats.totalSessions).toBe(1);
      expect(stats.activeSessions).toBe(1);
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
      expect(stats.sessionsCreatedLastHour).toBe(1);
    });
  });
});
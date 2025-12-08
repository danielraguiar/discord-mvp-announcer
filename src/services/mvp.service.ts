import prisma from '../database/client';
import { MVP, MVPSpawn } from '@prisma/client';

export interface CreateMVPData {
  name: string;
  map: string;
  respawnTimeMinutes: number;
  priority?: number;
  customMessage?: string;
}

export interface UpdateMVPData {
  name?: string;
  map?: string;
  respawnTimeMinutes?: number;
  priority?: number;
  customMessage?: string;
  isActive?: boolean;
}

export interface SpawnMVPData {
  userId?: string;
  username?: string;
  autoTimer?: boolean;
}

export class MVPService {
  async createMVP(data: CreateMVPData): Promise<MVP> {
    return prisma.mVP.create({
      data: {
        name: data.name,
        map: data.map,
        respawnTimeMinutes: data.respawnTimeMinutes,
        priority: data.priority ?? 0,
        customMessage: data.customMessage,
      },
    });
  }

  async updateMVP(mvpId: string, data: UpdateMVPData): Promise<MVP> {
    return prisma.mVP.update({
      where: { id: mvpId },
      data,
    });
  }

  async deleteMVP(mvpId: string): Promise<void> {
    await prisma.mVP.delete({
      where: { id: mvpId },
    });
  }

  async getMVPById(mvpId: string): Promise<MVP | null> {
    return prisma.mVP.findUnique({
      where: { id: mvpId },
    });
  }

  async getMVPByName(name: string): Promise<MVP | null> {
    return prisma.mVP.findUnique({
      where: { name },
    });
  }

  async getAllMVPs(activeOnly = false): Promise<MVP[]> {
    return prisma.mVP.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ priority: 'desc' }, { name: 'asc' }],
    });
  }

  async spawnMVP(mvpId: string, data: SpawnMVPData = {}): Promise<MVPSpawn> {
    const mvp = await this.getMVPById(mvpId);
    if (!mvp) {
      throw new Error('MVP não encontrado');
    }

    const now = new Date();
    const expectedRespawn = data.autoTimer
      ? new Date(now.getTime() + mvp.respawnTimeMinutes * 60 * 1000)
      : null;

    return prisma.mVPSpawn.create({
      data: {
        mvpId,
        spawnedAt: now,
        announcedAt: now,
        expectedRespawn,
        userId: data.userId,
        username: data.username,
      },
    });
  }

  async spawnMVPWithTime(mvpId: string, respawnTime: Date, data: SpawnMVPData = {}): Promise<MVPSpawn> {
    const mvp = await this.getMVPById(mvpId);
    if (!mvp) {
      throw new Error('MVP não encontrado');
    }

    const now = new Date();
    const expectedRespawn = data.autoTimer ? respawnTime : null;

    return prisma.mVPSpawn.create({
      data: {
        mvpId,
        spawnedAt: now,
        announcedAt: now,
        expectedRespawn,
        userId: data.userId,
        username: data.username,
      },
    });
  }

  async killMVP(spawnId: string): Promise<MVPSpawn> {
    return prisma.mVPSpawn.update({
      where: { id: spawnId },
      data: { killedAt: new Date() },
    });
  }

  async getActiveSpawns(): Promise<(MVPSpawn & { mvp: MVP })[]> {
    return prisma.mVPSpawn.findMany({
      where: {
        killedAt: null,
      },
      include: {
        mvp: true,
      },
      orderBy: {
        spawnedAt: 'desc',
      },
    });
  }

  async getSpawnHistory(limit = 50): Promise<(MVPSpawn & { mvp: MVP })[]> {
    return prisma.mVPSpawn.findMany({
      include: {
        mvp: true,
      },
      orderBy: {
        spawnedAt: 'desc',
      },
      take: limit,
    });
  }

  async getUpcomingRespawns(): Promise<(MVPSpawn & { mvp: MVP })[]> {
    const now = new Date();
    return prisma.mVPSpawn.findMany({
      where: {
        expectedRespawn: {
          gte: now,
        },
        killedAt: null,
      },
      include: {
        mvp: true,
      },
      orderBy: {
        expectedRespawn: 'asc',
      },
    });
  }

  formatAnnouncementMessage(mvp: MVP): string {
    if (mvp.customMessage) {
      return mvp.customMessage;
    }
    return `Daqui 5 minutos o MVP ${mvp.name} vai respawnar!`;
  }
}

export const mvpService = new MVPService();


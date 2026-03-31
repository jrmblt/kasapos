import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class TablesService {
  constructor(private prisma: PrismaService) { }

  // ── ดึงโต๊ะจาก qrToken (self-order สแกน QR) ──────────
  async findByToken(qrToken: string) {
    const table = await this.prisma.table.findUnique({
      where: { qrToken },
      include: {
        branch: {
          select: {
            id: true,
            tenantId: true,
            name: true,
            selfOrderEnabled: true,
            payLaterEnabled: true,
            payAtCounterEnabled: true,
            payOnlineEnabled: true,
            queueEnabled: true,
            queueDisplayName: true,
            loyaltyEnabled: true,
          },
        },
      },
    })

    if (!table) throw new NotFoundException('ไม่พบโต๊ะนี้')
    if (!table.branch.selfOrderEnabled) {
      throw new NotFoundException('ร้านนี้ยังไม่เปิดระบบสั่งอาหารเอง')
    }

    // หา session ที่เปิดอยู่ หรือสร้างใหม่
    let session = await this.prisma.tableSession.findFirst({
      where: { tableId: table.id, status: 'OPEN' },
      orderBy: { openedAt: 'desc' },
    })

    if (!session) {
      session = await this.prisma.tableSession.create({
        data: { tableId: table.id, status: 'OPEN' },
      })
    }

    return {
      id: table.id,
      name: table.name,
      zone: table.zone,
      branchId: table.branchId,
      sessionId: session.id,
      branch: {
        ...table.branch,
        // tenantId ส่งออกไปให้ frontend ใช้ query menu/coupon
      },
    }
  }

  // ── CRUD สำหรับ backoffice ────────────────────────────
  async findAll(branchId: string) {
    return this.prisma.table.findMany({
      where: { branchId },
      orderBy: [{ zone: 'asc' }, { name: 'asc' }],
    })
  }

  async create(branchId: string, data: {
    name: string; zone?: string; capacity?: number
  }) {
    return this.prisma.table.create({
      data: {
        ...data,
        branchId,
        qrToken: crypto.randomUUID(),
      },
    })
  }

  async regenerateQr(tableId: string, tenantId: string) {
    // verify ownership ผ่าน branch
    const table = await this.prisma.table.findFirst({
      where: { id: tableId, branch: { tenantId } },
    })
    if (!table) throw new NotFoundException('ไม่พบโต๊ะ')

    return this.prisma.table.update({
      where: { id: tableId },
      data: { qrToken: crypto.randomUUID() },
      select: { id: true, name: true, qrToken: true },
    })
  }
}
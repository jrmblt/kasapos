import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) { }

  async open(branchId: string, userId: string, openCash: number) {
    return this.prisma.shift.create({
      data: { branchId, userId, openCash },
    })
  }

  async close(shiftId: string, closeCash: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id: shiftId },
      select: { id: true, openCash: true },
    })
    if (!shift) throw new NotFoundException('ไม่พบกะ')

    // คำนวณยอดขายในกะนี้
    const cashPayments = await this.prisma.payment.aggregate({
      where: {
        status: 'CONFIRMED',
        method: 'CASH',
        createdAt: {
          gte: (await this.prisma.shift.findUnique({
            where: { id: shiftId }, select: { openedAt: true },
          }))!.openedAt
        },
      },
      _sum: { amount: true },
    })

    const expectedCash = Number(shift.openCash) + Number(cashPayments._sum.amount ?? 0)
    const difference = closeCash - expectedCash

    return this.prisma.shift.update({
      where: { id: shiftId },
      data: { closeCash, expectedCash, difference, closedAt: new Date() },
    })
  }

  async getCurrent(branchId: string, userId: string) {
    return this.prisma.shift.findFirst({
      where: { branchId, userId, closedAt: null },
      orderBy: { openedAt: 'desc' },
    })
  }
}
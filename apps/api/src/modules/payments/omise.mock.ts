export interface OmiseCharge {
  id: string
  status: 'pending' | 'successful' | 'failed'
  amount: number
  currency: string
  description: string
  source?: {
    type: string
    scannable_code?: {
      image?: { download_uri: string }
    }
    phone_number?: string
  }
  expires_at: string
  metadata: Record<string, string>
}

export interface OmiseRefund {
  id: string
  amount: number
  status: string
}

class OmiseMock {
  async createCharge(params: {
    amount: number
    currency: string
    source: { type: string }
    description: string
    metadata: Record<string, string>
  }): Promise<OmiseCharge> {
    const chargeId = `mock_chrg_${Date.now()}`
    return {
      id: chargeId,
      status: 'pending',
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      source: {
        type: params.source.type,
        // mock QR image URL — dev ใช้ได้เลย
        scannable_code: {
          image: {
            download_uri: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=MOCK_PROMPTPAY_${chargeId}`,
          },
        },
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: params.metadata,
    }
  }

  async createRefund(
    chargeId: string,
    params: { amount: number; reason?: string },
  ): Promise<OmiseRefund> {
    return {
      id: `mock_rfnd_${Date.now()}`,
      amount: params.amount,
      status: 'successful',
    }
  }
}

// ── Factory — swap ตาม env ────────────────────────────
// USE_REAL_OMISE=true → ใช้ SDK จริง (ต้อง install ด้วย: bun add omise)
// USE_REAL_OMISE=false (default) → mock

export function createOmiseClient() {
  if (process.env.USE_REAL_OMISE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Omise = require('omise')
    return Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY!,
      secretKey: process.env.OMISE_SECRET_KEY!,
    })
  }
  return new OmiseMock()
}
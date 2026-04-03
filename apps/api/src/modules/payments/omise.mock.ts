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

// ── PromptPay QR payload builder (EMVCo / BOT spec) ──────────────────────────
// CRC-16/CCITT-FALSE (poly=0x1021, init=0xFFFF)
function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function tlv(tag: string, value: string): string {
  return `${tag}${String(value.length).padStart(2, '0')}${value}`
}

/**
 * สร้าง PromptPay QR payload ตามมาตรฐาน EMVCo / BOT
 * @param phone เบอร์ไทย เช่น "0982585534" หรือ "0066982585534"
 * @param amountSatangs จำนวนเงินหน่วย satangs (1 บาท = 100); undefined = ไม่ระบุ
 */
export function buildPromptPayPayload(phone: string, amountSatangs?: number): string {
  // normalize → 0066XXXXXXXXX (13 digits)
  const digits = phone.replace(/\D/g, '')
  const normalized =
    digits.startsWith('0066')
      ? digits
      : digits.startsWith('66')
        ? `00${digits}`
        : `0066${digits.slice(1)}` // แทน leading 0 ด้วย 0066

  const merchantInfo = tlv('00', 'A000000677010111') + tlv('01', normalized)
  const parts: string[] = [
    tlv('00', '01'),         // payload format indicator
    tlv('01', '12'),         // initiation method: dynamic
    tlv('29', merchantInfo), // merchant account info (PromptPay)
    tlv('58', 'TH'),         // country
    tlv('53', '764'),        // currency THB
  ]

  if (amountSatangs !== undefined) {
    const baht = (amountSatangs / 100).toFixed(2)
    parts.push(tlv('54', baht))
  }

  const payloadBase = parts.join('') + '6304' // 6304 = CRC tag + length
  return payloadBase + crc16(payloadBase)
}

/**
 * สร้าง URL ของภาพ QR จาก api.qrserver.com
 */
function promptPayQrImageUrl(payload: string, size = 300): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(payload)}`
}

// ── เบอร์รับเงิน (override ด้วย PROMPTPAY_PHONE ใน env) ────────────────────
const MOCK_PROMPTPAY_PHONE = process.env.PROMPTPAY_PHONE ?? '0982585534'

class OmiseMock {
  async createCharge(params: {
    amount: number
    currency: string
    source: { type: string }
    description: string
    metadata: Record<string, string>
  }): Promise<OmiseCharge> {
    const chargeId = `mock_chrg_${Date.now()}`

    const qrPayload = buildPromptPayPayload(MOCK_PROMPTPAY_PHONE, params.amount)
    const qrUrl = promptPayQrImageUrl(qrPayload)

    return {
      id: chargeId,
      status: 'pending',
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      source: {
        type: params.source.type,
        scannable_code: {
          image: { download_uri: qrUrl },
        },
      },
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      metadata: params.metadata,
    }
  }

  async createRefund(
    _chargeId: string,
    params: { amount: number; reason?: string },
  ): Promise<OmiseRefund> {
    return {
      id: `mock_rfnd_${Date.now()}`,
      amount: params.amount,
      status: 'successful',
    }
  }
}

// ── Factory — swap ตาม env ────────────────────────────────────────────────────
// USE_REAL_OMISE=true  → ใช้ Omise SDK จริง (bun add omise)
// USE_REAL_OMISE=false → OmiseMock (default)

export function createOmiseClient() {
  if (process.env.USE_REAL_OMISE === 'true') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Omise = require('omise')
    return Omise({
      publicKey: process.env.OMISE_PUBLIC_KEY ?? '',
      secretKey: process.env.OMISE_SECRET_KEY ?? '',
    })
  }
  return new OmiseMock()
}

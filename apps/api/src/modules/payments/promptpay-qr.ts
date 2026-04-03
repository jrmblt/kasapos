// PromptPay EMV QR Code generator (Thai standard, BOT / NPCI spec)
// ใช้สำหรับ mock dev — phone ของร้านเป็น fallback ถ้าไม่มี env
//
// Output: string ที่สแกนด้วยแอปธนาคารได้จริง (CRC16-CCITT verified)

const DEFAULT_PROMPTPAY_PHONE =
  process.env.PROMPTPAY_PHONE ?? '0982585534'

// ── EMV TLV helper ────────────────────────────────────
function tlv(tag: string, value: string): string {
  return `${tag}${value.length.toString().padStart(2, '0')}${value}`
}

// ── CRC-16/CCITT-FALSE (poly 0x1021, init 0xFFFF) ───────
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

// ── Normalize phone → 0066XXXXXXXXX (13 digits) ─────────
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  // รองรับทั้ง 0xxxxxxxxx (10 หลัก) และ 66xxxxxxxxx (11 หลัก)
  if (digits.startsWith('66') && digits.length === 11) return `0066${digits.slice(2)}`
  if (digits.startsWith('0') && digits.length === 10) return `0066${digits.slice(1)}`
  return `0066${digits}`
}

// ── Build PromptPay QR payload ────────────────────────────
export function buildPromptPayQR(params: {
  phone?: string
  amount?: number // บาท (e.g. 150.50) — ถ้าไม่ใส่ ลูกค้ากรอกเองในแอป
}): string {
  const phone = normalizePhone(params.phone ?? DEFAULT_PROMPTPAY_PHONE)

  // Tag 29 — PromptPay merchant account info
  const merchantInfo =
    tlv('00', 'A000000677010111') + // AID
    tlv('01', phone) //               phone

  let payload =
    tlv('00', '01') + //      payload format indicator = 01
    tlv('01', '12') + //      dynamic QR (one-time)
    tlv('29', merchantInfo) + // PromptPay info
    tlv('53', '764') //       currency THB

  if (params.amount !== undefined && params.amount > 0) {
    payload += tlv('54', params.amount.toFixed(2))
  }

  payload +=
    tlv('58', 'TH') // country code
  // CRC placeholder then compute
  payload += '6304'
  return payload + crc16(payload)
}

// ── QR image URL via api.qrserver.com (no API key needed) ──
export function promptPayQRImageUrl(params: {
  phone?: string
  amount?: number
  size?: number
}): string {
  const payload = buildPromptPayQR(params)
  const size = params.size ?? 400
  return (
    `https://api.qrserver.com/v1/create-qr-code/` +
    `?size=${size}x${size}&ecc=M&margin=1&data=${encodeURIComponent(payload)}`
  )
}

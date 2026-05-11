/**
 * ZK Fingerprint Device Communication Library
 *
 * Implements the ZK Protocol (port 4370) for communicating with
 * ZKTeco fingerprint devices. Supports:
 * - Connect/Disconnect
 * - Pull attendance logs
 * - Push user/employee data
 * - Get device info (SN, firmware)
 * - Delete attendance logs after pulling
 *
 * Protocol Reference: ZK Standalone Communication Protocol
 * Uses TCP sockets on port 4370 (default)
 */

import net from 'net'

// ZK Protocol Commands
const CMD_CONNECT = 1000
const CMD_EXIT = 1001
const CMD_ENABLEDEVICE = 1002
const CMD_DISABLEDEVICE = 1003
const CMD_ACK_OK = 2000
const CMD_ACK_UNAUTH = 2005
const CMD_ACK_ERROR = 2004
const CMD_PREPARE_DATA = 1500
const CMD_DATA = 1501
const CMD_FREE_DATA = 1502
const CMD_DB_RRQ = 7       // Read records
const CMD_USERTEMP_RRQ = 9
const CMD_ATTLOG_RRQ = 13  // Read attendance log
const CMD_CLEAR_ATTLOG = 15
const CMD_WRITE = 18
const CMD_CLEAR_ADMIN = 20
const CMD_SET_USER = 8
const CMD_DEVICE = 11

const USHRT_MAX = 65535

function createHeader(command: number, chksum: number, sessionId: number, replyId: number, data: Buffer = Buffer.alloc(0)): Buffer {
  const buf = Buffer.alloc(8 + data.length)
  buf.writeUInt16LE(command, 0)
  buf.writeUInt16LE(chksum, 2)
  buf.writeUInt16LE(sessionId, 4)
  buf.writeUInt16LE(replyId, 6)
  if (data.length > 0) {
    data.copy(buf, 8)
  }
  return buf
}

function checkSum(buf: Buffer): number {
  let chksum = 0
  for (let i = 0; i < buf.length; i += 2) {
    if (i === buf.length - 1) {
      chksum += buf[i]
    } else {
      chksum += buf.readUInt16LE(i)
    }
  }
  return chksum & USHRT_MAX
}

export interface ZKAttendanceRecord {
  userId: number      // User ID on the device
  timestamp: string   // YYYY-MM-DD HH:MM:SS
  verifyType: number  // 0=FP, 1=FP+PW, 2=Card, 3=PW, 4=Card+FP
  status: number      // 0=CheckIn, 1=CheckOut, 2=BreakOut, 3=BreakIn, 4=OTIn, 5=OTOut
}

export interface ZKUserInfo {
  uid: number         // User ID on device
  userId: string      // Employee ID string
  name: string        // Name
  password: string    // Password (empty = no password)
  role: number        // 0=User, 1=Admin, 2=Manager, 3=SuperAdmin
}

export interface ZKDeviceInfo {
  sn: string
  firmware: string
  productTime: string
  macAddress: string
  platform: string
  deviceName: string
  userCount: number
  fingerCount: number
  attLogCount: number
  ip: string
}

export class ZKDevice {
  private ip: string
  private port: number
  private socket: net.Socket | null = null
  private sessionId = 0
  private replyId = 0
  private connected = false
  private timeout: number

  constructor(ip: string, port = 4370, timeout = 5000) {
    this.ip = ip
    this.port = port
    this.timeout = timeout
  }

  private async sendCommand(command: number, data: Buffer = Buffer.alloc(0)): Promise<{ code: number; data: Buffer; sessionId: number }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Command timeout'))
      }, this.timeout)

      if (!this.socket || !this.connected) {
        clearTimeout(timer)
        reject(new Error('Not connected'))
        return
      }

      const header = createHeader(command, 0, this.sessionId, this.replyId, data)
      const chksum = checkSum(header)
      header.writeUInt16LE(chksum, 2)

      this.replyId += 1

      const responseHandler = (responseData: Buffer) => {
        if (responseData.length < 8) return

        const code = responseData.readUInt16LE(0)
        const sessionId = responseData.readUInt16LE(4)

        clearTimeout(timer)
        this.socket!.off('data', responseHandler)

        if (code === CMD_ACK_OK || code === CMD_PREPARE_DATA) {
          this.sessionId = sessionId
          resolve({
            code,
            data: responseData.slice(8),
            sessionId,
          })
        } else if (code === CMD_ACK_UNAUTH) {
          reject(new Error('Device unauthorized - may need authentication'))
        } else if (code === CMD_ACK_ERROR) {
          reject(new Error('Device returned error'))
        } else {
          resolve({
            code,
            data: responseData.slice(8),
            sessionId,
          })
        }
      }

      this.socket.on('data', responseHandler)
      this.socket.write(header)
    })
  }

  private async receiveData(size: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Data receive timeout'))
      }, this.timeout + 10000) // Extra time for large data

      if (!this.socket) {
        clearTimeout(timer)
        reject(new Error('Not connected'))
        return
      }

      let received = Buffer.alloc(0)

      const handler = (chunk: Buffer) => {
        received = Buffer.concat([received, chunk])
        if (received.length >= size) {
          clearTimeout(timer)
          this.socket!.off('data', handler)
          resolve(received.slice(0, size))
        }
      }

      this.socket.on('data', handler)
    })
  }

  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.socket) {
          this.socket.destroy()
          this.socket = null
        }
        reject(new Error(`Connection timeout to ${this.ip}:${this.port}`))
      }, this.timeout)

      this.socket = new net.Socket()
      this.socket.setNoDelay(true)

      this.socket.connect(this.port, this.ip, async () => {
        clearTimeout(timer)
        try {
          const result = await this.sendCommand(CMD_CONNECT)
          if (result.code === CMD_ACK_OK) {
            this.connected = true
            resolve(true)
          } else {
            this.connected = false
            reject(new Error('Connection rejected by device'))
          }
        } catch (err) {
          reject(err)
        }
      })

      this.socket.on('error', (err) => {
        clearTimeout(timer)
        this.connected = false
        this.socket = null
        reject(new Error(`Connection error: ${err.message}`))
      })

      this.socket.on('close', () => {
        this.connected = false
      })
    })
  }

  async disconnect(): Promise<void> {
    if (this.socket && this.connected) {
      try {
        await this.sendCommand(CMD_EXIT)
        await this.sendCommand(CMD_ENABLEDEVICE)
      } catch {
        // Ignore errors on disconnect
      }
      this.connected = false
      this.socket.destroy()
      this.socket = null
    }
  }

  async disableDevice(): Promise<void> {
    await this.sendCommand(CMD_DISABLEDEVICE, Buffer.from('DisableDevice'))
  }

  async enableDevice(): Promise<void> {
    await this.sendCommand(CMD_ENABLEDEVICE)
  }

  async getSerialNumber(): Promise<string> {
    const result = await this.sendCommand(CMD_DEVICE, Buffer.from('~SerialNumber'))
    return result.data.toString('ascii').replace(/\0/g, '').trim()
  }

  async getFirmwareVersion(): Promise<string> {
    const result = await this.sendCommand(CMD_DEVICE, Buffer.from('~ZKFPVersion'))
    return result.data.toString('ascii').replace(/\0/g, '').trim()
  }

  async getDeviceInfo(): Promise<ZKDeviceInfo> {
    try {
      await this.disableDevice()

      let sn = ''
      let firmware = ''
      let userCount = 0
      let fingerCount = 0
      let attLogCount = 0

      try { sn = await this.getSerialNumber() } catch { /* ignore */ }
      try { firmware = await this.getFirmwareVersion() } catch { /* ignore */ }

      try {
        const countResult = await this.sendCommand(CMD_DEVICE, Buffer.from('~RecordCount'))
        const countStr = countResult.data.toString('ascii').replace(/\0/g, '').trim()
        attLogCount = parseInt(countStr) || 0
      } catch { /* ignore */ }

      try {
        const userCountResult = await this.sendCommand(CMD_DEVICE, Buffer.from('~UserCount'))
        const userCountStr = userCountResult.data.toString('ascii').replace(/\0/g, '').trim()
        userCount = parseInt(userCountStr) || 0
      } catch { /* ignore */ }

      return {
        sn,
        firmware,
        productTime: '',
        macAddress: '',
        platform: '',
        deviceName: '',
        userCount,
        fingerCount,
        attLogCount,
        ip: this.ip,
      }
    } finally {
      await this.enableDevice()
    }
  }

  async getAttendanceLogs(): Promise<ZKAttendanceRecord[]> {
    try {
      await this.disableDevice()

      // Request attendance logs
      const result = await this.sendCommand(CMD_ATTLOG_RRQ)

      if (result.code === CMD_PREPARE_DATA) {
        // The device is preparing data - read the size
        if (result.data.length >= 4) {
          const dataSize = result.data.readUInt32LE(0)

          // Read the actual data
          const rawData = await this.receiveData(dataSize + 16)

          // Free the data buffer on the device
          await this.sendCommand(CMD_FREE_DATA)

          return this.parseAttendanceData(rawData)
        }
      }

      return []
    } catch (error) {
      console.error('[ZK] Error getting attendance logs:', error)
      throw error
    } finally {
      await this.enableDevice()
    }
  }

  private parseAttendanceData(data: Buffer): ZKAttendanceRecord[] {
    const records: ZKAttendanceRecord[] = []
    let offset = 0

    // ZK attendance record format: 40 bytes per record
    // Structure: UserID(2) + VerifyType(1) + Status(1) + Time(4) + padding(32)
    const RECORD_SIZE = 40

    while (offset + RECORD_SIZE <= data.length) {
      try {
        const userId = data.readUInt16LE(offset)
        const verifyType = data.readUInt8(offset + 2)
        const status = data.readUInt8(offset + 3)

        // Timestamp is 4 bytes - seconds since 2000-01-01 00:00:00
        const timeOffset = data.readUInt32LE(offset + 4)
        const baseDate = new Date(2000, 0, 1)
        const recordDate = new Date(baseDate.getTime() + timeOffset * 1000)

        if (userId > 0 && userId < 65535) {
          records.push({
            userId,
            timestamp: recordDate.toISOString().replace('T', ' ').substring(0, 19),
            verifyType,
            status,
          })
        }

        offset += RECORD_SIZE
      } catch {
        break
      }
    }

    return records
  }

  async setUser(userInfo: ZKUserInfo): Promise<boolean> {
    try {
      await this.disableDevice()

      // ZK Set User command format
      const userPacket = this.buildUserPacket(userInfo)
      const result = await this.sendCommand(CMD_SET_USER, userPacket)

      return result.code === CMD_ACK_OK
    } catch (error) {
      console.error('[ZK] Error setting user:', error)
      return false
    } finally {
      await this.enableDevice()
    }
  }

  private buildUserPacket(userInfo: ZKUserInfo): Buffer {
    // User packet format: UID(2) + Role(1) + Password(8) + Name(24) + Card(4) + UserID(24)
    const buf = Buffer.alloc(72)
    buf.writeUInt16LE(userInfo.uid, 0)
    buf.writeUInt8(userInfo.role, 2)
    buf.write(userInfo.password || '', 3, 8, 'ascii')
    buf.write(userInfo.name || '', 11, 24, 'utf8')
    buf.writeUInt32LE(0, 35) // Card number
    buf.write(userInfo.userId || '', 39, 24, 'ascii')
    return buf
  }

  async clearAttendanceLogs(): Promise<boolean> {
    try {
      const result = await this.sendCommand(CMD_CLEAR_ATTLOG)
      return result.code === CMD_ACK_OK
    } catch {
      return false
    }
  }

  async testConnection(): Promise<{ success: boolean; sn?: string; firmware?: string; error?: string }> {
    try {
      await this.connect()
      let sn = ''
      let firmware = ''

      try { sn = await this.getSerialNumber() } catch { /* ignore */ }
      try { firmware = await this.getFirmwareVersion() } catch { /* ignore */ }

      await this.disconnect()
      return { success: true, sn, firmware }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  isConnected(): boolean {
    return this.connected
  }
}

/**
 * Quick test if a ZK device is reachable
 */
export async function testDevice(ip: string, port = 4370): Promise<{ success: boolean; sn?: string; firmware?: string; error?: string }> {
  const device = new ZKDevice(ip, port)
  return device.testConnection()
}

/**
 * Sync attendance logs from a device and save to database
 */
export async function syncAttendanceFromDevice(
  ip: string,
  port: number,
  deviceId: string,
  employeeMap: Map<number, string>, // deviceUserId -> employeeId
  saveRecord: (record: { employeeId: string; date: Date; checkIn: Date | null; checkOut: Date | null; status: string; deviceId: string; fingerprintMatch: boolean }) => Promise<void>
): Promise<{ recordsPulled: number; errors: string[] }> {
  const device = new ZKDevice(ip, port)
  const errors: string[] = []
  let recordsPulled = 0

  try {
    await device.connect()
    const logs = await device.getAttendanceLogs()

    // Group logs by user+date
    const groupedByUserDate = new Map<string, { checkIn: Date | null; checkOut: Date | null }>()

    for (const log of logs) {
      const employeeId = employeeMap.get(log.userId)
      if (!employeeId) {
        // Skip records for users not in our system
        continue
      }

      const dateStr = log.timestamp.substring(0, 10) // YYYY-MM-DD
      const key = `${employeeId}_${dateStr}`
      const logTime = new Date(log.timestamp)

      // Status: 0=CheckIn, 1=CheckOut, 2=BreakOut, 3=BreakIn, 4=OTIn, 5=OTOut
      if (log.status === 0 || log.status === 3 || log.status === 4) {
        // Check-in type
        const existing = groupedByUserDate.get(key)
        if (existing) {
          if (!existing.checkIn || logTime < existing.checkIn) {
            existing.checkIn = logTime
          }
        } else {
          groupedByUserDate.set(key, { checkIn: logTime, checkOut: null })
        }
      } else {
        // Check-out type
        const existing = groupedByUserDate.get(key)
        if (existing) {
          if (!existing.checkOut || logTime > existing.checkOut) {
            existing.checkOut = logTime
          }
        } else {
          groupedByUserDate.set(key, { checkIn: null, checkOut: logTime })
        }
      }
    }

    // Save grouped records
    for (const [key, times] of groupedByUserDate) {
      const [employeeId, dateStr] = key.split('_')
      const date = new Date(dateStr + 'T00:00:00')

      // Calculate status based on time
      let status = 'PRESENT'
      if (times.checkIn) {
        const hour = times.checkIn.getHours()
        const minute = times.checkIn.getMinutes()
        // If checked in after 8:15, mark as late
        if (hour > 8 || (hour === 8 && minute > 15)) {
          status = 'LATE'
        }
      } else if (!times.checkIn && !times.checkOut) {
        status = 'ABSENT'
      }

      try {
        await saveRecord({
          employeeId,
          date,
          checkIn: times.checkIn,
          checkOut: times.checkOut,
          status,
          deviceId,
          fingerprintMatch: true,
        })
        recordsPulled++
      } catch (err) {
        errors.push(`Failed to save record for ${employeeId} on ${dateStr}: ${err instanceof Error ? err.message : 'Unknown'}`)
      }
    }

    // Clear logs from device after successful sync
    if (recordsPulled > 0) {
      await device.clearAttendanceLogs()
    }

    await device.disconnect()
  } catch (error) {
    errors.push(`Device connection error: ${error instanceof Error ? error.message : 'Unknown'}`)
    try { await device.disconnect() } catch { /* ignore */ }
  }

  return { recordsPulled, errors }
}

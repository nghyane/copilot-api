import consola from "consola"

interface LogEntry {
  timestamp: string
  requestId: string
  type: 'request' | 'response' | 'error' | 'streaming' | 'orchestration'
  format: 'anthropic' | 'openai'
  data: any
}

export class PayloadLogger {
  private static instance: PayloadLogger
  private logDir = 'logs'
  private enabled = process.env.ENABLE_PAYLOAD_LOGGING === 'true' // Only enable if explicitly set

  static getInstance(): PayloadLogger {
    if (!PayloadLogger.instance) {
      PayloadLogger.instance = new PayloadLogger()
    }
    return PayloadLogger.instance
  }

  private async ensureLogDir(): Promise<void> {
    if (!this.enabled) return

    try {
      const fs = await import('node:fs/promises')
      await fs.mkdir(this.logDir, { recursive: true })
      await fs.writeFile(`${this.logDir}/.gitkeep`, '')
    } catch (error) {
      consola.debug('Log directory already exists or created')
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  private getLogFileName(requestId: string, type: string): string {
    const date = new Date().toISOString().split('T')[0]
    return `${this.logDir}/${date}_${requestId}_${type}.json`
  }

  async logRequest(payload: any, format: 'anthropic' | 'openai'): Promise<string> {
    const requestId = this.generateRequestId()
    
    if (!this.enabled) {
      consola.debug('Payload logging disabled, skipping request log')
      return requestId
    }

    await this.ensureLogDir()
    
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'request',
      format,
      data: payload
    }

    const fileName = this.getLogFileName(requestId, 'request')

    try {
      const fs = await import('node:fs/promises')
      await fs.writeFile(fileName, JSON.stringify(logEntry, null, 2))
      consola.debug(`Request logged: ${fileName}`)
    } catch (error) {
      consola.error('Failed to log request:', error)
    }

    return requestId
  }

  async logResponse(requestId: string, response: any, format: 'anthropic' | 'openai'): Promise<void> {
    if (!this.enabled) {
      consola.debug('Payload logging disabled, skipping response log')
      return
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'response',
      format,
      data: response
    }

    const fileName = this.getLogFileName(requestId, 'response')

    try {
      const fs = await import('node:fs/promises')
      await fs.writeFile(fileName, JSON.stringify(logEntry, null, 2))
      consola.debug(`Response logged: ${fileName}`)
    } catch (error) {
      consola.error('Failed to log response:', error)
    }
  }

  async logError(requestId: string, error: any, format: 'anthropic' | 'openai'): Promise<void> {
    if (!this.enabled) {
      consola.debug('Payload logging disabled, skipping error log')
      return
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      requestId,
      type: 'error',
      format,
      data: {
        message: error.message,
        stack: error.stack,
        ...(typeof error === 'object' ? error : { error })
      }
    }

    const fileName = this.getLogFileName(requestId, 'error')

    try {
      const fs = await import('node:fs/promises')
      await fs.writeFile(fileName, JSON.stringify(logEntry, null, 2))
      consola.debug(`Error logged: ${fileName}`)
    } catch (error) {
      consola.error('Failed to log error:', error)
    }
  }

  // Removed complex logging methods - keeping only basic request/response/error logging
}
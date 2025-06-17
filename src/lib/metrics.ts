interface Metrics {
  requestCount: number
  errorCount: number
  streamingCount: number
  cacheHits: number
  cacheMisses: number
  startTime: number
  lastRequestTime: number
}

export class MetricsTracker {
  private static instance: MetricsTracker
  private metrics: Metrics = {
    requestCount: 0,
    errorCount: 0,
    streamingCount: 0,
    cacheHits: 0,
    cacheMisses: 0,
    startTime: Date.now(),
    lastRequestTime: 0,
  }

  static getInstance(): MetricsTracker {
    if (!MetricsTracker.instance) {
      MetricsTracker.instance = new MetricsTracker()
    }
    return MetricsTracker.instance
  }

  incrementRequests(): void {
    this.metrics.requestCount++
    this.metrics.lastRequestTime = Date.now()
  }

  incrementErrors(): void {
    this.metrics.errorCount++
  }

  incrementStreaming(): void {
    this.metrics.streamingCount++
  }

  incrementCacheHits(): void {
    this.metrics.cacheHits++
  }

  incrementCacheMisses(): void {
    this.metrics.cacheMisses++
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime
    const requestRate = this.metrics.requestCount / (uptime / 1000 / 60) // requests per minute

    return {
      ...this.metrics,
      uptime,
      requestRate: Math.round(requestRate * 100) / 100,
      errorRate: this.metrics.requestCount > 0 
        ? Math.round((this.metrics.errorCount / this.metrics.requestCount) * 10000) / 100 
        : 0,
    }
  }

  reset(): void {
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      streamingCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      startTime: Date.now(),
      lastRequestTime: 0,
    }
  }
}
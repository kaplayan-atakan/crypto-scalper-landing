export class RateLimiter {
  private queue: (() => Promise<any>)[] = []
  private running = 0
  private maxConcurrent = 3
  
  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent
  }
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      
      this.process()
    })
  }
  
  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return
    }
    
    this.running++
    const fn = this.queue.shift()
    
    if (fn) {
      try {
        await fn()
      } finally {
        this.running--
        // Küçük delay ekle (rate limiting için)
        await new Promise(resolve => setTimeout(resolve, 100))
        this.process()
      }
    }
  }
  
  getStatus() {
    return {
      running: this.running,
      queued: this.queue.length,
      maxConcurrent: this.maxConcurrent
    }
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter(3)

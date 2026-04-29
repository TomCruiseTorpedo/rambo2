/**
 * Enhanced Database Operations and Error Handling Utilities
 * Implements task 3.9: Improve database operations and error handling
 * 
 * Features:
 * - Connection error handling and retry logic
 * - Field mapping queries and caching
 * - Data validation and sanitization
 * - Comprehensive logging for debugging
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.4";

// Types for enhanced error handling
export interface DatabaseError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  operation: string;
  retryable: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface DatabaseMetrics {
  operation: string;
  duration: number;
  success: boolean;
  retryCount: number;
  cacheHit?: boolean;
  error?: string;
}

// Enhanced Supabase client with connection pooling and error handling
export class EnhancedSupabaseClient {
  private client: SupabaseClient;
  private cache = new Map<string, CacheEntry<any>>();
  private metrics: DatabaseMetrics[] = [];
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  constructor(url?: string, key?: string) {
    const supabaseUrl = url || Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = key || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase configuration. Please check environment variables.");
    }

    this.client = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'User-Agent': 'Rambo2-Enhanced-DB/1.0'
        }
      }
    });

    // Log client initialization
    this.logOperation("client_init", 0, true, 0);
  }

  /**
   * Enhanced field mapping retrieval with caching and retry logic
   */
  async getFieldMapping(mappingName: string, useCache: boolean = true): Promise<any> {
    const operation = `get_field_mapping_${mappingName}`;
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Check cache first
      if (useCache) {
        const cached = this.getCachedData(mappingName);
        if (cached) {
          this.logOperation(operation, Date.now() - startTime, true, retryCount, true);
          return cached;
        }
      }

      // Validate mapping name to prevent injection
      if (!this.isValidMappingName(mappingName)) {
        throw new Error(`Invalid mapping name: ${mappingName}`);
      }

      const result = await this.retryOperation(async () => {
        const { data, error } = await this.client.storage
          .from("field_mappings")
          .download(`${mappingName}.json`);

        if (error) {
          throw this.createDatabaseError(
            error.message,
            "STORAGE_DOWNLOAD_ERROR",
            operation,
            error,
            this.isRetryableError(error)
          );
        }

        if (!data) {
          throw this.createDatabaseError(
            "No data returned from storage",
            "NO_DATA_ERROR",
            operation,
            null,
            false
          );
        }

        const text = await data.text();
        const parsed = JSON.parse(text);
        
        // Validate the parsed data structure
        this.validateFieldMappingStructure(parsed, mappingName);
        
        return parsed;
      }, this.defaultRetryConfig);

      // Cache the result
      if (useCache) {
        this.setCachedData(mappingName, result, 300000); // 5 minutes TTL
      }

      this.logOperation(operation, Date.now() - startTime, true, retryCount);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation(operation, duration, false, retryCount, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Enhanced file upload with validation and retry logic
   */
  async uploadFile(
    bucket: string,
    path: string,
    data: Uint8Array | string,
    options: {
      contentType?: string;
      upsert?: boolean;
      cacheControl?: string;
    } = {}
  ): Promise<string> {
    const operation = `upload_file_${bucket}`;
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Validate inputs
      this.validateUploadInputs(bucket, path, data);

      const result = await this.retryOperation(async () => {
        const { data: uploadData, error } = await this.client.storage
          .from(bucket)
          .upload(path, data, {
            contentType: options.contentType || 'application/octet-stream',
            upsert: options.upsert || false,
            cacheControl: options.cacheControl || '3600'
          });

        if (error) {
          throw this.createDatabaseError(
            error.message,
            "STORAGE_UPLOAD_ERROR",
            operation,
            error,
            this.isRetryableError(error)
          );
        }

        return uploadData;
      }, this.defaultRetryConfig);

      // Get public URL
      const { data: urlData } = this.client.storage
        .from(bucket)
        .getPublicUrl(path);

      this.logOperation(operation, Date.now() - startTime, true, retryCount);
      return urlData.publicUrl;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation(operation, duration, false, retryCount, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Enhanced file download with retry logic and validation
   */
  async downloadFile(bucket: string, path: string): Promise<Uint8Array> {
    const operation = `download_file_${bucket}`;
    const startTime = Date.now();
    let retryCount = 0;

    try {
      // Validate inputs
      this.validateDownloadInputs(bucket, path);

      const result = await this.retryOperation(async () => {
        const { data, error } = await this.client.storage
          .from(bucket)
          .download(path);

        if (error) {
          throw this.createDatabaseError(
            error.message,
            "STORAGE_DOWNLOAD_ERROR",
            operation,
            error,
            this.isRetryableError(error)
          );
        }

        if (!data) {
          throw this.createDatabaseError(
            "No data returned from storage",
            "NO_DATA_ERROR",
            operation,
            null,
            false
          );
        }

        return new Uint8Array(await data.arrayBuffer());
      }, this.defaultRetryConfig);

      this.logOperation(operation, Date.now() - startTime, true, retryCount);
      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      this.logOperation(operation, duration, false, retryCount, false, error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Generic retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    config: RetryConfig = this.defaultRetryConfig
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError)) {
          throw lastError;
        }
        
        if (attempt < config.maxRetries) {
          const delay = Math.min(
            config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
            config.maxDelay
          );
          
          console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms delay. Error: ${lastError.message}`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * Determine if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message?.toLowerCase() || '';
    const code = error.code || error.status;
    
    // Network errors are retryable
    if (message.includes('network') || message.includes('timeout') || message.includes('connection')) {
      return true;
    }
    
    // HTTP status codes that are retryable
    if (typeof code === 'number') {
      return code >= 500 || code === 429 || code === 408;
    }
    
    // Supabase specific retryable errors
    const retryableCodes = ['PGRST301', 'PGRST302', '23505', '40001'];
    return retryableCodes.some(retryableCode => 
      message.includes(retryableCode.toLowerCase()) || 
      (error.code && error.code.includes(retryableCode))
    );
  }

  /**
   * Create standardized database error
   */
  private createDatabaseError(
    message: string,
    code: string,
    operation: string,
    details?: any,
    retryable: boolean = false
  ): DatabaseError {
    return {
      code,
      message: `Database operation '${operation}' failed: ${message}`,
      details,
      timestamp: new Date().toISOString(),
      operation,
      retryable
    };
  }

  /**
   * Cache management
   */
  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Clear expired cache entries
   */
  public clearExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Input validation methods
   */
  private isValidMappingName(name: string): boolean {
    // Only allow alphanumeric characters, underscores, and hyphens
    return /^[a-zA-Z0-9_-]+$/.test(name) && name.length <= 100;
  }

  private validateUploadInputs(bucket: string, path: string, data: any): void {
    if (!bucket || typeof bucket !== 'string') {
      throw new Error("Invalid bucket name");
    }
    if (!path || typeof path !== 'string') {
      throw new Error("Invalid file path");
    }
    if (!data) {
      throw new Error("No data provided for upload");
    }
    if (path.includes('..') || path.includes('//')) {
      throw new Error("Invalid file path: path traversal detected");
    }
  }

  private validateDownloadInputs(bucket: string, path: string): void {
    if (!bucket || typeof bucket !== 'string') {
      throw new Error("Invalid bucket name");
    }
    if (!path || typeof path !== 'string') {
      throw new Error("Invalid file path");
    }
    if (path.includes('..') || path.includes('//')) {
      throw new Error("Invalid file path: path traversal detected");
    }
  }

  private validateFieldMappingStructure(data: any, mappingName: string): void {
    if (!data || typeof data !== 'object') {
      throw new Error(`Invalid field mapping structure for ${mappingName}: not an object`);
    }

    // Validate critical fields mapping structure
    if (mappingName.includes('critical_fields')) {
      const requiredFields = ['line_242_uncertainties', 'line_244_work_performed', 'line_246_advancements'];
      for (const field of requiredFields) {
        if (!data[field]) {
          throw new Error(`Missing required field '${field}' in ${mappingName}`);
        }
        if (!data[field].coordinates || !data[field].dimensions) {
          throw new Error(`Invalid field structure for '${field}' in ${mappingName}`);
        }
      }
    }
  }

  /**
   * Logging and metrics
   */
  private logOperation(
    operation: string,
    duration: number,
    success: boolean,
    retryCount: number,
    cacheHit?: boolean,
    error?: string
  ): void {
    const metric: DatabaseMetrics = {
      operation,
      duration,
      success,
      retryCount,
      cacheHit,
      error
    };

    this.metrics.push(metric);

    // Log to console with structured format
    console.log(JSON.stringify({
      type: 'database_operation',
      timestamp: new Date().toISOString(),
      ...metric
    }));

    // Keep only last 100 metrics to prevent memory issues
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get database operation metrics
   */
  public getMetrics(): DatabaseMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get database health summary
   */
  public getHealthSummary(): {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    cacheHitRate: number;
    commonErrors: string[];
  } {
    if (this.metrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        cacheHitRate: 0,
        commonErrors: []
      };
    }

    const successful = this.metrics.filter(m => m.success).length;
    const totalDuration = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheableOps = this.metrics.filter(m => m.cacheHit !== undefined).length;
    
    const errors = this.metrics
      .filter(m => !m.success && m.error)
      .map(m => m.error!)
      .reduce((acc, error) => {
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    const commonErrors = Object.entries(errors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([error]) => error);

    return {
      totalOperations: this.metrics.length,
      successRate: (successful / this.metrics.length) * 100,
      averageDuration: totalDuration / this.metrics.length,
      cacheHitRate: cacheableOps > 0 ? (cacheHits / cacheableOps) * 100 : 0,
      commonErrors
    };
  }

  /**
   * Test database connectivity
   */
  async testConnection(): Promise<boolean> {
    const operation = 'connection_test';
    const startTime = Date.now();

    try {
      // Simple operation to test connectivity
      const { data, error } = await this.client.storage.listBuckets();
      
      if (error) {
        throw error;
      }

      this.logOperation(operation, Date.now() - startTime, true, 0);
      return true;

    } catch (error) {
      this.logOperation(operation, Date.now() - startTime, false, 0, false, error instanceof Error ? error.message : String(error));
      return false;
    }
  }
}

/**
 * Singleton instance for shared use across Edge Functions
 */
let sharedClient: EnhancedSupabaseClient | null = null;

export function getEnhancedSupabaseClient(url?: string, key?: string): EnhancedSupabaseClient {
  if (!sharedClient) {
    sharedClient = new EnhancedSupabaseClient(url, key);
  }
  return sharedClient;
}

/**
 * Utility function to sanitize field data
 */
export function sanitizeFieldData(data: Record<string, any>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Remove potentially dangerous characters and normalize whitespace
      sanitized[key] = value
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 10000); // Limit length to prevent memory issues
    } else if (value != null) {
      sanitized[key] = String(value).substring(0, 1000);
    }
  }
  
  return sanitized;
}

/**
 * Utility function to validate PDF field data
 */
export function validatePDFFieldData(fieldData: Record<string, string>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const requiredFields = ['line_242_uncertainties', 'line_244_work_performed', 'line_246_advancements'];
  
  for (const field of requiredFields) {
    const content = fieldData[field];
    
    if (!content || (typeof content === 'string' && content.trim().length === 0)) {
      errors.push(`Missing required field: ${field}`);
      continue;
    }
    
    if (typeof content !== 'string') {
      errors.push(`Field ${field} must be a string`);
      continue;
    }
    
    // Check length limits (T661 form constraints)
    if (content.length > 2000) {
      warnings.push(`Field ${field} exceeds 2000 character limit (${content.length} characters)`);
    }
    
    // Check word count
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount > 350) {
      warnings.push(`Field ${field} exceeds 350 word limit (${wordCount} words)`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}
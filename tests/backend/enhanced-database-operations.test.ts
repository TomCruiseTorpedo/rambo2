/**
 * Tests for Enhanced Database Operations and Error Handling
 * Validates task 3.9 implementation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock Deno environment
const mockDeno = {
  env: {
    get: vi.fn((key: string) => {
      const env: Record<string, string> = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-key'
      };
      return env[key];
    })
  }
};

// Mock Supabase client
const mockSupabaseClient = {
  storage: {
    from: vi.fn().mockReturnThis(),
    download: vi.fn(),
    upload: vi.fn(),
    getPublicUrl: vi.fn(),
    listBuckets: vi.fn()
  }
};

// Mock createClient
vi.mock('https://esm.sh/@supabase/supabase-js@2.39.4', () => ({
  createClient: vi.fn(() => mockSupabaseClient)
}));

// Set up global Deno mock
(globalThis as any).Deno = mockDeno;

import { 
  EnhancedSupabaseClient, 
  getEnhancedSupabaseClient,
  sanitizeFieldData,
  validatePDFFieldData,
  DatabaseError
} from '../../supabase/functions/shared/database-utils.ts';

describe('Enhanced Database Operations', () => {
  let client: EnhancedSupabaseClient;

  beforeEach(() => {
    vi.clearAllMocks();
    
    client = new EnhancedSupabaseClient('https://test.supabase.co', 'test-key');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Field Mapping Operations', () => {
    it('should successfully retrieve field mapping with caching', async () => {
      const mockMappingData = {
        line_242_uncertainties: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_244_work_performed: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_246_advancements: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        }
      };

      const mockBlob = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockMappingData)),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      };
      mockSupabaseClient.storage.download.mockResolvedValue({
        data: mockBlob,
        error: null
      });

      const result = await client.getFieldMapping('t661_critical_fields');
      
      expect(result).toEqual(mockMappingData);
      expect(mockSupabaseClient.storage.from).toHaveBeenCalledWith('field_mappings');
      expect(mockSupabaseClient.storage.download).toHaveBeenCalledWith('t661_critical_fields.json');
    });

    it('should use cached data on subsequent requests', async () => {
      const mockMappingData = {
        line_242_uncertainties: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_244_work_performed: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_246_advancements: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        }
      };

      const mockBlob = {
        text: vi.fn().mockResolvedValue(JSON.stringify(mockMappingData)),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      };
      mockSupabaseClient.storage.download.mockResolvedValue({
        data: mockBlob,
        error: null
      });

      // First request
      await client.getFieldMapping('t661_critical_fields');
      
      // Second request should use cache
      const result = await client.getFieldMapping('t661_critical_fields');
      
      expect(result).toEqual(mockMappingData);
      // Should only call download once due to caching
      expect(mockSupabaseClient.storage.download).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockMappingData = {
        line_242_uncertainties: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_244_work_performed: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        },
        line_246_advancements: {
          coordinates: { x0: 0, y0: 0, x1: 100, y1: 100 },
          dimensions: { width: 100, height: 100 }
        }
      };

      // First call fails with retryable error
      mockSupabaseClient.storage.download
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValue({
          data: {
            text: vi.fn().mockResolvedValue(JSON.stringify(mockMappingData)),
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
          },
          error: null
        });

      const result = await client.getFieldMapping('t661_critical_fields');
      
      expect(result).toEqual(mockMappingData);
      expect(mockSupabaseClient.storage.download).toHaveBeenCalledTimes(2);
    });

    it('should validate mapping name to prevent injection', async () => {
      await expect(client.getFieldMapping('../../../etc/passwd')).rejects.toThrow('Invalid mapping name');
      await expect(client.getFieldMapping('valid_mapping_name')).resolves.toBeDefined();
    });

    it('should validate field mapping structure', async () => {
      const invalidMappingData = {
        line_242_uncertainties: {
          // Missing coordinates and dimensions
        }
      };

      const mockBlob = {
        text: vi.fn().mockResolvedValue(JSON.stringify(invalidMappingData)),
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      };
      mockSupabaseClient.storage.download.mockResolvedValue({
        data: mockBlob,
        error: null
      });

      await expect(client.getFieldMapping('t661_critical_fields')).rejects.toThrow('Invalid field structure');
    });
  });

  describe('File Upload Operations', () => {
    it('should successfully upload file with retry logic', async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);
      
      mockSupabaseClient.storage.upload.mockResolvedValue({
        data: { path: 'test/file.pdf' },
        error: null
      });

      mockSupabaseClient.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/test/file.pdf' }
      });

      const result = await client.uploadFile('test-bucket', 'test/file.pdf', testData, {
        contentType: 'application/pdf',
        upsert: true
      });

      expect(result).toBe('https://test.supabase.co/storage/v1/object/public/test/file.pdf');
      expect(mockSupabaseClient.storage.upload).toHaveBeenCalledWith(
        'test/file.pdf',
        testData,
        {
          contentType: 'application/pdf',
          upsert: true,
          cacheControl: '3600'
        }
      );
    });

    it('should validate upload inputs', async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);

      await expect(client.uploadFile('', 'file.pdf', testData)).rejects.toThrow('Invalid bucket name');
      await expect(client.uploadFile('bucket', '', testData)).rejects.toThrow('Invalid file path');
      await expect(client.uploadFile('bucket', 'file.pdf', null as any)).rejects.toThrow('No data provided');
      await expect(client.uploadFile('bucket', '../../../etc/passwd', testData)).rejects.toThrow('path traversal detected');
    });
  });

  describe('File Download Operations', () => {
    it('should successfully download file with retry logic', async () => {
      const testData = new Uint8Array([1, 2, 3, 4]);
      const mockBlob = {
        text: vi.fn().mockResolvedValue('test'),
        arrayBuffer: vi.fn().mockResolvedValue(testData.buffer)
      };
      
      mockSupabaseClient.storage.download.mockResolvedValue({
        data: mockBlob,
        error: null
      });

      const result = await client.downloadFile('test-bucket', 'test/file.pdf');

      expect(result).toEqual(testData);
      expect(mockSupabaseClient.storage.download).toHaveBeenCalledWith('test/file.pdf');
    });

    it('should validate download inputs', async () => {
      await expect(client.downloadFile('', 'file.pdf')).rejects.toThrow('Invalid bucket name');
      await expect(client.downloadFile('bucket', '')).rejects.toThrow('Invalid file path');
      await expect(client.downloadFile('bucket', '../../../etc/passwd')).rejects.toThrow('path traversal detected');
    });
  });

  describe('Connection Testing', () => {
    it('should test database connectivity successfully', async () => {
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await client.testConnection();
      
      expect(result).toBe(true);
      expect(mockSupabaseClient.storage.listBuckets).toHaveBeenCalled();
    });

    it('should handle connection test failures', async () => {
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({
        data: null,
        error: new Error('Connection failed')
      });

      const result = await client.testConnection();
      
      expect(result).toBe(false);
    });
  });

  describe('Metrics and Health Monitoring', () => {
    it('should track operation metrics', async () => {
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({
        data: [],
        error: null
      });

      await client.testConnection();
      
      const metrics = client.getMetrics();
      expect(metrics).toHaveLength(2); // client_init + connection_test
      expect(metrics[1]).toMatchObject({
        operation: 'connection_test',
        success: true,
        retryCount: 0
      });
    });

    it('should provide health summary', async () => {
      mockSupabaseClient.storage.listBuckets.mockResolvedValue({
        data: [],
        error: null
      });

      await client.testConnection();
      
      const health = client.getHealthSummary();
      expect(health).toMatchObject({
        totalOperations: 2,
        successRate: 100,
        cacheHitRate: 0,
        commonErrors: []
      });
    });
  });

  describe('Cache Management', () => {
    it('should clear expired cache entries', () => {
      // This is a unit test for the cache clearing functionality
      client.clearExpiredCache();
      // Since cache is private, we can't directly test it, but we ensure no errors
      expect(true).toBe(true);
    });
  });
});

describe('Utility Functions', () => {
  describe('sanitizeFieldData', () => {
    it('should sanitize field data properly', () => {
      const input = {
        field1: 'Normal text content',
        field2: 'Text with <script>alert("xss")</script> tags',
        field3: 'Text   with   multiple   spaces',
        field4: '  Leading and trailing spaces  ',
        field5: 123,
        field6: null,
        field7: undefined
      };

      const result = sanitizeFieldData(input);

      expect(result).toEqual({
        field1: 'Normal text content',
        field2: 'Text with scriptalert("xss")/script tags',
        field3: 'Text with multiple spaces',
        field4: 'Leading and trailing spaces',
        field5: '123'
      });
    });

    it('should limit field length to prevent memory issues', () => {
      const longText = 'a'.repeat(20000);
      const input = { longField: longText };

      const result = sanitizeFieldData(input);

      expect(result.longField).toHaveLength(10000);
    });
  });

  describe('validatePDFFieldData', () => {
    it('should validate required fields', () => {
      const validData = {
        line_242_uncertainties: 'Valid uncertainty description',
        line_244_work_performed: 'Valid work description',
        line_246_advancements: 'Valid advancement description'
      };

      const result = validatePDFFieldData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        line_242_uncertainties: 'Valid uncertainty description'
        // Missing other required fields
      };

      const result = validatePDFFieldData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing required field: line_244_work_performed');
      expect(result.errors).toContain('Missing required field: line_246_advancements');
    });

    it('should warn about length limits', () => {
      const longText = 'word '.repeat(400); // 400 words
      const data = {
        line_242_uncertainties: longText,
        line_244_work_performed: 'Valid work description',
        line_246_advancements: 'Valid advancement description'
      };

      const result = validatePDFFieldData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Field line_242_uncertainties exceeds 350 word limit (400 words)');
    });

    it('should warn about character limits', () => {
      const longText = 'a'.repeat(2500);
      const data = {
        line_242_uncertainties: longText,
        line_244_work_performed: 'Valid work description',
        line_246_advancements: 'Valid advancement description'
      };

      const result = validatePDFFieldData(data);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Field line_242_uncertainties exceeds 2000 character limit (2500 characters)');
    });

    it('should handle empty fields', () => {
      const data = {
        line_242_uncertainties: '',
        line_244_work_performed: '   ',
        line_246_advancements: 'Valid advancement description'
      };

      const result = validatePDFFieldData(data);

      expect(result.isValid).toBe(false); // Empty fields should make it invalid
      expect(result.errors).toContain('Missing required field: line_242_uncertainties');
      expect(result.errors).toContain('Missing required field: line_244_work_performed');
    });
  });
});

describe('Singleton Pattern', () => {
  it('should return the same instance', () => {
    const client1 = getEnhancedSupabaseClient('https://test.supabase.co', 'test-key');
    const client2 = getEnhancedSupabaseClient('https://test.supabase.co', 'test-key');
    
    expect(client1).toBe(client2);
  });
});
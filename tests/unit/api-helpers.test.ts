import { afterEach, beforeEach, describe, expect, it, type SpyInstance, vi } from 'vitest';

import { handleHttpError } from '../../src/utils/api-helpers.js';

describe('api-helpers', () => {
  let mockExit: SpyInstance<typeof process.exit>;
  let mockStderrWrite: SpyInstance<typeof process.stderr.write>;

  beforeEach(() => {
    mockExit = vi.spyOn(process, 'exit').mockImplementation((() => {}) as typeof process.exit);
    mockStderrWrite = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    mockExit.mockRestore();
    mockStderrWrite.mockRestore();
  });

  describe('handleHttpError', () => {
    it('prints authentication error for 401', () => {
      handleHttpError(401);
      expect(mockStderrWrite).toHaveBeenCalledWith(
        'Authentication failed. Check your credentials.\n',
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('prints access denied error for 403', () => {
      handleHttpError(403);
      expect(mockStderrWrite).toHaveBeenCalledWith('Access denied for this resource.\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('prints not found error for 404', () => {
      handleHttpError(404);
      expect(mockStderrWrite).toHaveBeenCalledWith('Resource not found.\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('prints error message from string error for other status codes', () => {
      handleHttpError(500, 'Internal Server Error');
      expect(mockStderrWrite).toHaveBeenCalledWith('Error: Internal Server Error\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('prints JSON stringified error object for other status codes', () => {
      handleHttpError(500, { message: 'Server error', status: 500 });
      expect(mockStderrWrite).toHaveBeenCalledWith(
        'Error: {"message":"Server error","status":500}\n',
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it('prints generic HTTP error when no error details provided', () => {
      handleHttpError(502);
      expect(mockStderrWrite).toHaveBeenCalledWith('Error: HTTP 502\n');
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });
});

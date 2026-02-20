import { describe, it } from 'node:test';
import assert from 'node:assert';
import { PinchtabError, ValidationError } from './index.js';

describe('types', () => {
  describe('PinchtabError', () => {
    it('should create error with code', () => {
      const error = new PinchtabError('Test error', 'TEST_CODE');
      assert.strictEqual(error.message, 'Test error');
      assert.strictEqual(error.code, 'TEST_CODE');
      assert.strictEqual(error.name, 'PinchtabError');
    });

    it('should include status code', () => {
      const error = new PinchtabError('Not found', 'NOT_FOUND', 404);
      assert.strictEqual(error.statusCode, 404);
    });
  });

  describe('ValidationError', () => {
    it('should create validation error', () => {
      const error = new ValidationError('Invalid input');
      assert.strictEqual(error.message, 'Invalid input');
      assert.strictEqual(error.name, 'ValidationError');
    });

    it('should include field name', () => {
      const error = new ValidationError('Required', 'tabId');
      assert.strictEqual(error.field, 'tabId');
    });
  });
});

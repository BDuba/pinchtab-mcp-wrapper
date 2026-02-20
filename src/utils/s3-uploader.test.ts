import { describe, it } from 'node:test';
import assert from 'node:assert';
import { generateScreenshotFilename } from './s3-uploader.js';

describe('s3-uploader', () => {
  describe('generateScreenshotFilename', () => {
    it('should generate unique filenames', () => {
      const filename1 = generateScreenshotFilename();
      const filename2 = generateScreenshotFilename();
      assert.notStrictEqual(filename1, filename2);
    });

    it('should include timestamp', () => {
      const filename = generateScreenshotFilename();
      assert.match(filename, /screenshot-\d{4}-\d{2}-\d{2}T/);
    });

    it('should have jpg extension', () => {
      const filename = generateScreenshotFilename();
      assert.ok(filename.endsWith('.jpg'));
    });
  });
});

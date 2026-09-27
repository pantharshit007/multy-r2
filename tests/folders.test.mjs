import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadEndpointFolders, createEndpointFolderPath } from '../src/client/lib/folders.ts';
import { beginFolderCacheLoad, completeFolderCacheLoad, readFolderCache, invalidateFolderCache } from '../src/client/lib/folderCache.ts';
import { createEndpointFolder, deleteEndpointObject, endpointFolderExists } from '../src/client/api/endpointRecords.ts';
import { FOLDER_CACHE_TTL_MS } from '../src/client/constants/index.ts';

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const record = { endPoint: 'https://test.invalid', apiKey: 'test-only', workerBucketMode: true, bucketBindingName: 'BUCKET_A', customDomain: '' };
afterEach(() => { globalThis.fetch = originalFetch; Date.now = originalNow; invalidateFolderCache(record); });

function page(keys, cursor) {
  return Response.json({ objects: keys.map(key => ({ key, size: 0 })), truncated: !!cursor, cursor });
}

test('publishes pages progressively, then reuses the complete listing', async () => {
  let requests = 0;
  const progress = [];
  globalThis.fetch = async () => ++requests === 1 ? page(['temp/hi.txt'], 'next') : page(['temp/nested/file.txt']);
  assert.deepEqual(await loadEndpointFolders(record, new AbortController().signal, folders => progress.push(folders)), ['temp', 'temp/nested']);
  assert.deepEqual(progress, [['temp'], ['temp', 'temp/nested']]);
  await loadEndpointFolders(record, new AbortController().signal);
  assert.equal(requests, 2);
});

test('cache expires and separates bindings and credentials', () => {
  const entry = beginFolderCacheLoad(record);
  completeFolderCacheLoad(record, entry, ['temp']);
  assert.deepEqual(readFolderCache(record), ['temp']);
  assert.equal(readFolderCache({ ...record, bucketBindingName: 'BUCKET_B' }), null);
  assert.equal(readFolderCache({ ...record, apiKey: 'other' }), null);
  Date.now = () => originalNow() + FOLDER_CACHE_TTL_MS + 1;
  assert.equal(readFolderCache(record), null);
});

test('successful writes and deletes invalidate cache; stale scans cannot repopulate it', async () => {
  for (const mutate of [() => createEndpointFolder(record, 'new'), () => deleteEndpointObject(record, 'old/')]) {
    const entry = beginFolderCacheLoad(record);
    completeFolderCacheLoad(record, entry, ['old']);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    await mutate();
    completeFolderCacheLoad(record, entry, ['stale']);
    assert.equal(readFolderCache(record), null);
  }
});

test('aborted or invalid pagination never caches partial folders', async () => {
  globalThis.fetch = async () => page(['temp/'], 'same');
  await assert.rejects(loadEndpointFolders(record, new AbortController().signal), /Could not load all folders/);
  assert.equal(readFolderCache(record), null);
  const controller = new AbortController();
  globalThis.fetch = async () => page(['temp/'], 'next');
  await assert.rejects(loadEndpointFolders(record, controller.signal, () => controller.abort()), { name: 'AbortError' });
  assert.equal(readFolderCache(record), null);
});

test('nested creation uses only targeted HEAD/PUT requests and reuses existing ancestors', async () => {
  const requests = [];
  globalThis.fetch = async (url, init) => {
    const path = new URL(url).pathname;
    requests.push([init.method, path]);
    return new Response(null, { status: init.method === 'HEAD' && !path.endsWith('/photos/') ? 404 : 200 });
  };
  await createEndpointFolderPath(record, 'photos/vacation', []);
  assert.deepEqual(requests, [
    ['HEAD', '/api/r2/bucket/BUCKET_A/photos/'],
    ['HEAD', '/api/r2/bucket/BUCKET_A/photos/vacation/'],
    ['PUT', '/api/r2/bucket/BUCKET_A/photos/vacation/'],
  ]);
});

test('new ancestors are created in order without a bucket scan', async () => {
  const writes = [];
  globalThis.fetch = async (url, init) => {
    assert.notEqual(init.method, 'PATCH');
    if (init.method === 'PUT') writes.push(new URL(url).pathname);
    return new Response(null, { status: init.method === 'HEAD' ? 404 : 200 });
  };
  await createEndpointFolderPath(record, 'photos/vacation', []);
  assert.deepEqual(writes, ['/api/r2/bucket/BUCKET_A/photos/', '/api/r2/bucket/BUCKET_A/photos/vacation/']);
});

test('folder existence errors do not trigger writes', async () => {
  globalThis.fetch = async (_, init) => {
    assert.equal(init.method, 'HEAD');
    return new Response(null, { status: 403 });
  };
  await assert.rejects(endpointFolderExists(record, 'private'), /403/);
  await assert.rejects(createEndpointFolderPath(record, 'private', []), /403/);
});

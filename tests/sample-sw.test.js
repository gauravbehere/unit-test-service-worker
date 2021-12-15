const makeServiceWorkerEnv = require('service-worker-mock');

describe('Service worker', () => {
  beforeEach(() => {
    const serviceWorkerEnv = makeServiceWorkerEnv();
    Object.defineProperty(serviceWorkerEnv, 'addEventListener', {
      value: serviceWorkerEnv.addEventListener,
      enumerable: true
    });
    Object.assign(global, serviceWorkerEnv)
    jest.resetModules();
  });

  it('should add listeners', async () => {
    require('../src/sample-sw');

    await self.trigger('install');
    expect(self.listeners.get('install')).toBeDefined();
    expect(self.listeners.get('activate')).toBeDefined();
    expect(self.listeners.get('fetch')).toBeDefined();
  });

  it('should delete old caches on activate', async () => {
    require('../src/sample-sw');

    // Create old cache
    await self.caches.open('OLD_CACHE');
    expect(self.snapshot().caches.OLD_CACHE).toBeDefined();

    // Activate and verify old cache is removed
    await self.trigger('activate');
    expect(self.snapshot().caches.OLD_CACHE).toStrictEqual({});
  });

  it('should return a cached response', async () => {
    require('../src/sample-sw');

    const cachedResponse = { clone: () => { }, data: { key: 'value' } };
    const cachedRequest = new Request('/test');
    const cache = await self.caches.open('TEST');
    cache.put(cachedRequest, cachedResponse);

    const response = await self.trigger('fetch', cachedRequest);
    expect(response.data.key).toEqual('value');
  });

  it('should fetch and cache an uncached request and append the right auth token in the header', async () => {
    const mockResponse = { clone: () => { return { data: { key: 'value' } } } };
    global.fetch = (response) => Promise.resolve({ ...mockResponse, headers: response.headers });

    require('../src/sample-sw');

    const request = new Request('/test');
    const response = await self.trigger('fetch', request);
    expect(response.clone()).toEqual(mockResponse.clone());

    expect(response.headers.get('authorization')).toBe('Bearer my secret auth');

    const runtimeCache = self.snapshot().caches.runtime;
    expect(runtimeCache[request.url]).toEqual(mockResponse.clone());
  });

  it('should ignore the requests to external world', async () => {
    const mockResponse = { clone: () => { return { data: { key: 'value' } } } };
    global.fetch = (response) => Promise.resolve({ ...mockResponse, headers: response.headers });

    require('../src/sample-sw');

    const request = new Request('http://google.com');
    const response = await self.trigger('fetch', request);
    expect(response).not.toBeDefined();
  });
});

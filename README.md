# unit-test-service-worker
Writing unit tests for service workers made easy.

<img  width="20%" src="https://seeklogo.com/images/J/jest-logo-F9901EBBF7-seeklogo.com.png"/>
<img  width="70%" src="https://miro.medium.com/max/694/1*aO4HRVpU1zQ22rvhAeSK1w.png"/>

## Note
This code sample is an enhancement on top of [Service Worker Mock](https://github.com/zackargyle/service-workers/tree/master/packages/service-worker-mock). Service Worker Mock explains how to write unit tests for service works. Since it is not maintained any more, I am writing this code sample to unblock ourselves from the current issues in that library.
Tests are written using the sample service worker given at [service worker example](https://github.com/GoogleChrome/samples/blob/gh-pages/service-worker/basic/service-worker.js)

## Problem with the current version (2.0.5) of service worker mock
Object.assign(global, makeServiceWorkerEnv()) no longer puts EventTarget methods like addEventListener into the global scope because they are no longer "own" properties of ServiceWorkerGlobalScope

## Workaround
- Make `addEventListener` an enumerable property
```
beforeEach(() => {
   const serviceWorkerEnv = makeServiceWorkerEnv();
   Object.defineProperty(serviceWorkerEnv, 'addEventListener', {
      value: serviceWorkerEnv.addEventListener,
      enumerable: true
   });
   Object.assign(global, serviceWorkerEnv)
   jest.resetModules();
});
```

### Testing Event registration
```
it('should add listeners', async () => {
  require('../src/sample-sw');
  await self.trigger('install');
  expect(self.listeners.get('install')).toBeDefined();
  expect(self.listeners.get('activate')).toBeDefined();
  expect(self.listeners.get('fetch')).toBeDefined();
});
```

### Testing cache deletion on activation
```
it('should delete old caches on activate', async () => {
  require('../src/sample-sw');

  // Create old cache
  await self.caches.open('OLD_CACHE');
  expect(self.snapshot().caches.OLD_CACHE).toBeDefined();

  // Activate and verify old cache is removed
  await self.trigger('activate');
  expect(self.snapshot().caches.OLD_CACHE).toStrictEqual({});
});
```

### Testing fetch event to see if it returns cached response
```
it('should return a cached response', async () => {
  require('../src/sample-sw');

  const cachedResponse = { clone: () => { }, data: { key: 'value' } };
  const cachedRequest = new Request('/test');
  const cache = await self.caches.open('TEST');
  cache.put(cachedRequest, cachedResponse);

  const response = await self.trigger('fetch', cachedRequest);
  expect(response.data.key).toEqual('value');
});
```

### Testing if fetch event makes network call & updates cache. Also test any custom logic like appending a bearer token in the request
```
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
```

### Testing if the requests to the external domains are ignored
```
it('should ignore the requests to external world', async () => {
  const mockResponse = { clone: () => { return { data: { key: 'value' } } } };
  global.fetch = (response) => Promise.resolve({ ...mockResponse, headers: response.headers });

  require('../src/sample-sw');

  const request = new Request('http://google.com');
  const response = await self.trigger('fetch', request);
  expect(response).not.toBeDefined();
});
```

## Coverage
<img src="https://github.com/gauravbehere/unit-test-service-worker/blob/main/coverage.PNG"/>


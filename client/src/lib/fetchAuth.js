// client/src/lib/fetchAuth.js
// עוטף את window.fetch כדי להוסיף Authorization: Bearer <token> אוטומטית לכל בקשה
(function patchFetchForAuth() {
  const origFetch = window.fetch;
  window.fetch = async (input, init = {}) => {
    try {
      const token =
        localStorage.getItem('token') || localStorage.getItem('authToken');

      const reqInit = { ...init, headers: new Headers(init && init.headers || {}) };

      if (token && !reqInit.headers.has('Authorization')) {
        reqInit.headers.set('Authorization', `Bearer ${token}`);
      }
      if (!reqInit.headers.has('Content-Type') && !(reqInit.body instanceof FormData)) {
        reqInit.headers.set('Content-Type', 'application/json');
      }
      return origFetch(input, reqInit);
    } catch (e) {
      return origFetch(input, init);
    }
  };
})();

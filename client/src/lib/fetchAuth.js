// client/src/lib/fetchAuth.js
(function patchFetchForAuth() {
  const origFetch = window.fetch;
  function getToken() {
    try {
      return (
        localStorage.getItem('token') ||
        localStorage.getItem('authToken') ||
        sessionStorage.getItem('token') ||
        sessionStorage.getItem('authToken') ||
        (document.cookie.match(/(?:^|;\s*)(token|jwt)=([^;]+)/i)?.[2] && decodeURIComponent(document.cookie.match(/(?:^|;\s*)(token|jwt)=([^;]+)/i)[2]))
      );
    } catch {
      return null;
    }
  }
  window.fetch = async (input, init = {}) => {
    try {
      const token = getToken();
      const reqInit = { ...init, headers: new Headers(init && init.headers || {}) };
      if (token && !reqInit.headers.has('Authorization')) {
        reqInit.headers.set('Authorization', `Bearer ${token}`);
      }
      if (!reqInit.headers.has('Content-Type') && !(reqInit.body instanceof FormData)) {
        reqInit.headers.set('Content-Type', 'application/json');
      }
      return origFetch(input, reqInit);
    } catch {
      return origFetch(input, init);
    }
  };
})();

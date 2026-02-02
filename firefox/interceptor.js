const script = document.createElement('script');
script.textContent = `
(function() {
  // ==========================================
  // [Spy Logic] Fetch & XHR 가로채기
  // ==========================================
  
  function sendToContentScript(data) {
    if (data && data.code === 0 && data.data && data.data.list) {
      window.postMessage({ type: "ENDFIELD_ROLE_DETECTED", payload: data }, "*");
    }
  }

  // 1. Fetch 가로채기
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    try {
      const url = args[0] ? args[0].toString() : "";
      if (url.includes("binding")) {
        const clone = response.clone();
        clone.json().then(data => sendToContentScript(data)).catch(()=>{});
      }
    } catch (e) {}
    return response;
  };

  // 2. XHR 가로채기
  const originalXHR = window.XMLHttpRequest;
  function newXHR() {
    const realXHR = new originalXHR();
    realXHR.addEventListener("load", function() {
      try {
        const url = realXHR.responseURL;
        if (url && url.includes("binding")) {
          const responseData = JSON.parse(realXHR.responseText);
          sendToContentScript(responseData);
        }
      } catch (e) {}
    });
    return realXHR;
  }
  newXHR.prototype = originalXHR.prototype; 
  window.XMLHttpRequest = newXHR;
  
  console.log("[Endfield Spy] 파이어폭스용 스파이더 웹 가동됨 🦊");
})();
`;

(document.head || document.documentElement).appendChild(script);
script.remove();
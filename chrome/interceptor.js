(function() {
  console.log("%c[Endfield Spy] 스파이더 웹 가동됨 🕸️", "color: #00ff00; font-weight: bold; font-size: 14px;");

  // ==========================================
  // 1. Fetch 가로채기 (기존 방식)
  // ==========================================
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const response = await originalFetch(...args);

    try {
      const url = args[0] ? args[0].toString() : "";
      // URL에 'binding'이 포함되어 있으면 분석 시도
      if (url.includes("binding")) {
        console.log("[Endfield Spy] Fetch에서 binding 감지됨!", url);
        
        const clone = response.clone();
        clone.json().then(data => {
          sendToContentScript(data);
        }).catch(() => {});
      }
    } catch (e) {
      // 에러 무시
    }

    return response;
  };

  // ==========================================
  // 2. XMLHttpRequest 가로채기 (추가된 방식!)
  // ==========================================
  const originalXHR = window.XMLHttpRequest;
  
  function newXHR() {
    const realXHR = new originalXHR();
    
    // 요청이 끝났을 때(load) 데이터를 훔쳐봄
    realXHR.addEventListener("load", function() {
      try {
        const url = realXHR.responseURL;
        if (url && url.includes("binding")) {
          console.log("[Endfield Spy] XHR에서 binding 감지됨!", url);
          
          // 응답이 JSON 문자열일 경우 파싱
          const responseData = JSON.parse(realXHR.responseText);
          sendToContentScript(responseData);
        }
      } catch (e) {
        // JSON이 아니거나 에러 발생 시 무시
      }
    });

    return realXHR;
  }

  // XHR 객체의 프로토타입 등을 복사해서 위장
  window.XMLHttpRequest = newXHR;


  // ==========================================
  // 3. 데이터 전송 함수 (공통)
  // ==========================================
  function sendToContentScript(data) {
    // 데이터 구조가 맞는지 한 번 더 확인
    if (data && data.code === 0 && data.data && data.data.list) {
      console.log("%c[Endfield Spy] ✨ 정답 데이터 포착! 전송합니다.", "color: yellow; font-weight: bold;");
      window.postMessage({ type: "ENDFIELD_ROLE_DETECTED", payload: data }, "*");
    }
  }

})();
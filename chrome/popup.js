document.addEventListener('DOMContentLoaded', () => {
  updateStatus(); // 켜자마자 상태 확인

  const btnManual = document.getElementById('btn-manual');
  if (btnManual) {
    btnManual.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "MANUAL_CHECKIN" });
      // 버튼 클릭 시 로그창에 즉시 피드백
      const logBox = document.getElementById('log-box');
      if (logBox) logBox.innerHTML = '<div class="log-item">🔄 요청 전송 중...</div>' + logBox.innerHTML;
    });
  }

  const btnRelogin = document.getElementById('btn-relogin');
  if (btnRelogin) {
    btnRelogin.addEventListener('click', () => {
      chrome.tabs.create({ url: "https://game.skport.com/endfield/sign-in" });
    });
  }
  
  // 로그 자동 갱신 리스너
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "UI_UPDATE") {
      updateUI();
    }
  });

  updateUI(); // 초기 로그 로드
});

function updateStatus() {
  const statusText = document.getElementById('status-text');
  const statusBox = document.getElementById('status-box');

  // ★ 안전장치: 태그가 없으면 실행 중단 (에러 방지)
  if (!statusText || !statusBox) {
    console.log("상태창 태그를 찾을 수 없습니다. popup.html을 확인하세요.");
    return;
  }

  chrome.storage.local.get(['userRoleId', 'userServerId'], (data) => {
    if (data.userRoleId && data.userServerId) {
      statusText.innerText = `✅ 준비 완료! (ID: ${data.userRoleId})`;
      statusBox.style.backgroundColor = "#d4edda"; // 초록색 배경
      statusBox.style.color = "#155724";
    } else {
      statusText.innerHTML = "⚠️ 정보 없음<br>공식 홈페이지에 접속(새로고침)해주세요.";
      statusBox.style.backgroundColor = "#f8d7da"; // 빨간색 배경
      statusBox.style.color = "#721c24";
    }
  });
}

function updateUI() {
  chrome.storage.local.get(['lastLog'], (data) => {
    const logBox = document.getElementById('log-box');
    if (!logBox) return;

    if (data.lastLog) {
      const time = new Date().toLocaleTimeString();
      const logHtml = `<div class="log-item"><span class="log-time">[${time}]</span>${data.lastLog}</div>`;
      // 로그가 너무 많으면 초기화 후 추가
      if (logBox.innerHTML.includes("대기 중")) logBox.innerHTML = "";
      logBox.innerHTML = logHtml + logBox.innerHTML;
    }

    // 401 에러 감지 시 버튼 교체 로직
    const reloginBtn = document.getElementById('btn-relogin');
    const manualBtn = document.getElementById('btn-manual');
    
    if (reloginBtn && manualBtn && data.lastLog && (data.lastLog.includes("401") || data.lastLog.includes("만료") || data.lastLog.includes("재로그인"))) {
      reloginBtn.style.display = "block";
      manualBtn.style.display = "none";
    } else if (reloginBtn && manualBtn) {
      reloginBtn.style.display = "none";
      manualBtn.style.display = "block";
    }
  });
}
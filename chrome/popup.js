document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  document.getElementById('btn-manual').addEventListener('click', () => {
    const statusDiv = document.getElementById('last-result');
    statusDiv.innerText = "⏳ 요청 보내는 중...";
    statusDiv.style.color = "orange";
    
    // 백그라운드로 수동 실행 신호 전송
    chrome.runtime.sendMessage({ action: "MANUAL_CHECKIN" });
  });
});

// 상태 업데이트 함수
function updateUI() {
  chrome.storage.local.get(['hasCookie', 'lastLog'], (data) => {
    const cookieDiv = document.getElementById('cookie-status');
    const logDiv = document.getElementById('last-result');

    if (data.hasCookie) {
      cookieDiv.innerText = "연동 완료 (OK)";
      cookieDiv.className = "value ok";
    } else {
      cookieDiv.innerText = "로그인 필요 (그리프라인)";
      cookieDiv.className = "value no";
    }

    if (data.lastLog) {
      logDiv.innerText = data.lastLog;
      logDiv.style.color = data.lastLog.includes("성공") ? "green" : "#333";
    }
  });
}

// 백그라운드에서 작업이 끝나면 팝업을 갱신하라는 신호를 받을 수도 있음
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "UI_UPDATE") updateUI();
});
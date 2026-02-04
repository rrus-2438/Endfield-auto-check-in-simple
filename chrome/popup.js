document.addEventListener('DOMContentLoaded', () => {
  updateUI(); // 켜자마자 상태 확인

  // 수동 출석 버튼 이벤트
  const btnManual = document.getElementById('btn-manual');
  if (btnManual) {
    btnManual.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: "MANUAL_CHECKIN" });
      setStatus("loading"); // 버튼 누르면 즉시 '시도 중' 표시
    });
  }

  // 실시간 업데이트 감지
  chrome.runtime.onMessage.addListener((req) => {
    if (req.action === "UI_UPDATE") {
      updateUI();
    }
  });
});

function updateUI() {
  chrome.storage.local.get(['lastLog', 'lastSuccessDate'], (data) => {
    // 1. 로그창 업데이트
    const logBox = document.getElementById('log-box');
    if (logBox && data.lastLog) {
      const time = new Date().toLocaleTimeString();
      const logHtml = `<div class="log-item"><span class="log-time">[${time}]</span>${data.lastLog}</div>`;
      
      if (logBox.innerHTML.includes("대기 중")) logBox.innerHTML = "";
      
      // 로그가 중복으로 계속 쌓이는 것 방지
      if (!logBox.innerHTML.startsWith(`<div class="log-item"><span class="log-time">` + logHtml)) {
         // 로그 내용만 비교하기 위해 약간 단순화
         logBox.innerHTML = logHtml + logBox.innerHTML;
      }
    }

    // 상태창 업데이트 로직 개선
    const statusText = document.getElementById('status-text');
    const isTrying = statusText && statusText.innerText.includes("시도 중");
    const currentLog = data.lastLog || "";

    // 결정적인 결과가 나왔는지 검사
    const hasFinalResult = (
        currentLog.includes("로그인 필요") || 
        currentLog.includes("완료") || 
        currentLog.includes("성공") ||
        currentLog.includes("장부 기록됨") ||
        currentLog.includes("실패")
    );

    if (!isTrying || hasFinalResult) {
        checkAttendanceStatus(data.lastSuccessDate, data.lastLog);
    }
  });
}

function checkAttendanceStatus(savedDate, lastLog) {
  const todayKey = getTodayKey();

  // 1. 로그인 필요
  if (lastLog && lastLog.includes("로그인 필요")) {
    setStatus("login_needed");
    return;
  }

  // 2. 오늘 출석 성공 여부
  if (savedDate === todayKey) {
    setStatus("success", savedDate);
    return;
  } 

  // 3. 진행 중 (백그라운드 탭 열림)
  const logBox = document.getElementById('log-box');
  if (logBox && logBox.innerText.includes("백그라운드 탭 진입")) {
     setStatus("loading");
     return;
  }

  // 4. 대기 중 (기본)
  setStatus("waiting", savedDate);
}

// 화면 디자인 바꾸기 함수
function setStatus(type, dateStr = "") {
  const box = document.getElementById('status-box');
  const icon = document.getElementById('status-icon');
  const text = document.getElementById('status-text');
  const dateDiv = document.getElementById('status-date');

  if (!box) return;

  if (type === "success") {
    box.style.backgroundColor = "#d4edda"; 
    box.style.borderColor = "#c3e6cb";
    box.style.color = "#155724";
    icon.innerText = "✅";
    text.innerText = "오늘 출석 완료!";
    dateDiv.innerText = `기록된 날짜: ${dateStr}`;
  } 
  else if (type === "loading") {
    box.style.backgroundColor = "#cce5ff"; 
    box.style.borderColor = "#b8daff";
    box.style.color = "#004085";
    icon.innerText = "⏳";
    text.innerText = "로그인 및 출석 시도 중...";
    dateDiv.innerText = "잠시만 기다려주세요";
  }
  else if (type === "login_needed") {
    box.style.backgroundColor = "#f8d7da"; 
    box.style.borderColor = "#f5c6cb";
    box.style.color = "#721c24";
    icon.innerText = "🚨";
    text.innerText = "로그인이 필요합니다!";
    dateDiv.innerText = "탭이 열렸습니다. 로그인해주세요.";
  }
  else {
    box.style.backgroundColor = "#fff3cd"; 
    box.style.borderColor = "#ffeeba";
    box.style.color = "#856404";
    icon.innerText = "⚠️";
    text.innerText = "아직 출석 전입니다.";
    dateDiv.innerText = dateStr ? `마지막 출석: ${dateStr}` : "기록 없음";
  }
}

function getTodayKey() {
  const now = new Date();
  if (now.getHours() < 1) {
    now.setDate(now.getDate() - 1);
  }
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
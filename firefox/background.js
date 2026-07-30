const SIGN_IN_URL = "https://game.skport.com/endfield/sign-in";
let autoCheckInTabId = null; // 추적 중인 탭 ID

// ==========================================
// 1. 날짜 계산기 (한국 시간 기준, 새벽 1시 리셋)
// ==========================================
function getAttendanceDateKey() {
  const now = new Date();
  
  // 새벽 1시 이전(00:00 ~ 00:59)이면 '어제'로 취급
  if (now.getHours() < 1) {
    now.setDate(now.getDate() - 1);
  }
  
  // 로컬 시간 기준으로 날짜 문자열 생성
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0'); // 월은 0부터 시작하므로 +1
  const day = String(now.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// ==========================================
// 2. 브라우저 켜질 때 자동 실행
// ==========================================
chrome.runtime.onStartup.addListener(async () => {
  console.log("[Endfield] 브라우저 시작됨. 출석 여부 확인 중...");
  
  const { lastSuccessDate } = await chrome.storage.local.get(['lastSuccessDate']);
  const todayKey = getAttendanceDateKey();

  if (lastSuccessDate !== todayKey) {
    console.log(`[Endfield] 아직 출석 안 함! (마지막: ${lastSuccessDate || '없음'}). 자동 시작합니다.`);
    // 5초 뒤 실행
    setTimeout(startCheckInProcess, 5000);
  } else {
    console.log(`[Endfield] 오늘은 이미 완료함 (${todayKey}). 실행 안 함.`);
  }
});


// ==========================================
// 3. 메시지 처리 (결과 보고 받기)
// ==========================================
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "MANUAL_CHECKIN") {
    startCheckInProcess();
    sendResponse({ status: "started" });
  }
  
  // 결과 수신
  if (req.action === "CHECKIN_COMPLETED" || req.action === "CHECKIN_FAILED") {
    
    // 내가 연 탭인지 확인
    if (autoCheckInTabId !== null && sender.tab && sender.tab.id === autoCheckInTabId) {
      
      // 로그인 필요 시 탭 닫지 않기
      if (req.message === "LOGIN_REQUIRED") {
        saveLog("🚨 로그인 필요! 로그인 창을 띄웁니다.");
        console.log("[Endfield] 로그인이 풀림. 탭을 닫지 않고 활성화합니다.");
        
        // 1. 탭을 닫지 않고, 사용자 눈앞으로 가져옴 (Active: true)
        chrome.tabs.update(autoCheckInTabId, { active: true }).catch(() => {});
        
        // 2. 추적 변수는 초기화 (이제 이 탭은 사용자가 알아서 하도록 놔둠)
        autoCheckInTabId = null; 
        
        return;
      }

      // --- 정상 처리 (성공 또는 기타 에러) ---
      saveLog(req.message);
      
      if (req.action === "CHECKIN_COMPLETED") {
        const todayKey = getAttendanceDateKey();
        chrome.storage.local.set({ 'lastSuccessDate': todayKey });
        console.log(`[Endfield] 출석 장부 기록됨: ${todayKey}`);
      }

      console.log(`[Endfield] 작업 끝. 탭(${autoCheckInTabId}) 닫기 대기 중...`);
      const tabToRemove = autoCheckInTabId;
      autoCheckInTabId = null; 

      // 3초 뒤 닫기
      setTimeout(() => {
        chrome.tabs.remove(tabToRemove).catch(() => {}); 
      }, 3000);
    }
  }
});

// ==========================================
// 4. 출석 프로세스 (탭 열기)
// ==========================================
async function startCheckInProcess() {
  // 이미 진행 중인 탭이 있으면 중복 실행 방지 (탭 2개씩 뜨는 문제 방지)
  if (autoCheckInTabId !== null) {
    console.log(`[Endfield] 이미 진행 중인 탭(${autoCheckInTabId})이 있어 중복 실행을 건너뜁니다.`);
    return;
  }

  saveLog("🚀 자동 출석 시작: 백그라운드 탭 진입...");
  const tab = await chrome.tabs.create({ url: SIGN_IN_URL, active: false });
  autoCheckInTabId = tab.id;
  console.log(`[Endfield] 추적할 탭 ID: ${autoCheckInTabId}`);
}

function saveLog(msg) {
  chrome.storage.local.set({ 'lastLog': msg });
  chrome.runtime.sendMessage({ action: "UI_UPDATE" }).catch(() => {});
  console.log(`[Endfield] ${msg}`);
}


// ==========================================
// 5. 스케줄러 (매일 새벽 1시 10분)
// ==========================================
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "dailyCheck") return;

  // 이미 오늘 출석을 완료했다면 다시 실행하지 않음 (onStartup과 겹쳐 탭이 중복 생성되는 것 방지)
  const { lastSuccessDate } = await chrome.storage.local.get(['lastSuccessDate']);
  if (lastSuccessDate === getAttendanceDateKey()) {
    console.log("[Endfield] 알람 발화했지만 오늘은 이미 출석 완료됨. 실행 안 함.");
    return;
  }

  startCheckInProcess();
});

function initScheduler() {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(1, 10, 0, 0);
  if (now >= nextRun) nextRun.setDate(nextRun.getDate() + 1);
  chrome.alarms.create("dailyCheck", { when: nextRun.getTime(), periodInMinutes: 1440 });
}
initScheduler();
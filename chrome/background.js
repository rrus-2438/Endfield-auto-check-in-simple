const ATTENDANCE_URL = "https://zonai.skport.com/web/v1/game/endfield/attendance";
const MAIN_PAGE_URL = "https://game.skport.com/endfield/sign-in";
const TARGET_COOKIE_NAME = "SK_OAUTH_CRED_KEY"; 

// 1. 캐릭터 정보 저장 리스너
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === "SAVE_USER_INFO") {
    chrome.storage.local.set({
      'userRoleId': req.roleId,
      'userServerId': req.serverId
    }, () => {
      console.log(`[Endfield] 정보 저장 완료: ${req.roleId}`);
      sendResponse({ status: "success" });
    });
    saveLog(`👤 캐릭터 정보 갱신됨: ${req.roleId} (서버: ${req.serverId})`);
    return true; 
  }

  if (req.action === "MANUAL_CHECKIN") {
    doCheckIn();
    sendResponse({ status: "started" });
  }
});

// 2. 쿠키 감지
chrome.cookies.onChanged.addListener((changeInfo) => {
  if (changeInfo.cookie.domain.includes("skport.com") && changeInfo.cookie.name === TARGET_COOKIE_NAME && !changeInfo.removed) {
    chrome.storage.local.set({ 'cred': changeInfo.cookie.value, 'expirationDate': changeInfo.cookie.expirationDate, 'hasCookie': true });
  }
});

function getHeaders(credValue, roleString) {
  return {
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://game.skport.com",
    "Referer": "https://game.skport.com/",
    "Platform": "3",
    "Sk-Language": "ko",
    "Cred": credValue,
    "Sk-Game-Role": roleString,
    "Timestamp": Math.floor(Date.now() / 1000).toString(), // 현재 시간
    "Vname": "1.0.0", // 버전 정보
    "Content-Type": "application/json" // Body가 비어도 헤더는 보냄
  };
}

async function refreshSession(credValue) {
  try {
    await fetch(MAIN_PAGE_URL, { method: "GET", headers: { "Cred": credValue, "Sk-Language": "ko" } });
  } catch (e) {}
}

// 3. 출석체크 실행
async function doCheckIn() {
  try {
    const storage = await chrome.storage.local.get(['cred', 'userRoleId', 'userServerId']);
    
    if (!storage.userRoleId || !storage.userServerId) {
      saveLog("⚠️ 캐릭터 정보 없음. 공식 홈페이지 접속 필요.");
      return;
    }

    // 쿠키 추출 로직
    const allCookies = await chrome.cookies.getAll({ name: TARGET_COOKIE_NAME });
    const targetCookies = allCookies.filter(c => c.domain.includes("skport.com"));
    
    let credValue = "";

    if (targetCookies.length > 0) {
      targetCookies.sort((a, b) => b.expirationDate - a.expirationDate);
      let rawValue = targetCookies[0].value;

      if (rawValue.includes("%")) {
        try { rawValue = decodeURIComponent(rawValue); } catch(e) {}
      }

      if (rawValue.trim().startsWith("{")) {
        try {
          const json = JSON.parse(rawValue);
          credValue = json.token ? json.token : rawValue;
        } catch(e) { credValue = rawValue; }
      } else {
        credValue = rawValue;
      }
      
      credValue = credValue.trim();
      chrome.storage.local.set({ 'cred': credValue, 'expirationDate': targetCookies[0].expirationDate, 'hasCookie': true });
    } else {
      credValue = storage.cred;
    }

    if (!credValue) {
      saveLog("❌ 실패: 로그인 정보 없음");
      return;
    }

    await refreshSession(credValue);

    const myRoleString = `3_${storage.userRoleId}_${storage.userServerId}`;
    
    // 출석 여부 확인
    const checkRes = await fetch(ATTENDANCE_URL, {
      method: "GET",
      headers: getHeaders(credValue, myRoleString)
    });

    if (checkRes.status === 401) {
      saveLog("🚨 세션 만료됨: 재로그인 필요 (401)");
      return;
    }

    const checkData = await checkRes.json();
    if (checkData.code === 0 && checkData.data?.hasToday) {
      saveLog("✅ 이미 출석 완료됨");
      return;
    }

    const postRes = await fetch(ATTENDANCE_URL, {
      method: "POST",
      headers: getHeaders(credValue, myRoleString),
    });
    
    const postData = await postRes.json();

    if (postData.code === 0 || postData.code === 10001) {
      saveLog(`✅ 출석 성공! (${new Date().toLocaleTimeString()})`);
    } else {
      saveLog(`⚠️ 실패: ${postData.message} (Code: ${postData.code})`);
      console.log("실패 상세:", postData);
    }

  } catch (error) {
    if (!error.message.includes("401")) saveLog(`🔥 에러: ${error.message}`);
  }
}

function saveLog(msg) {
  chrome.storage.local.set({ 'lastLog': msg });
  chrome.runtime.sendMessage({ action: "UI_UPDATE" }).catch(() => {});
  console.log(`[Endfield] ${msg}`);
}

function initScheduler() {
  const now = new Date();
  const nextRun = new Date(now);
  nextRun.setHours(1, 5, 0, 0); // 매일 새벽 1시 5분 실행
  if (now >= nextRun) nextRun.setDate(nextRun.getDate() + 1);
  chrome.alarms.create("dailyCheck", { when: nextRun.getTime(), periodInMinutes: 1440 });
}
chrome.alarms.onAlarm.addListener((alarm) => { if (alarm.name === "dailyCheck") doCheckIn(); });
chrome.runtime.onStartup.addListener(() => { setTimeout(doCheckIn, 5000); });
initScheduler();
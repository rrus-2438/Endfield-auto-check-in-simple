// 캐릭터(Role) 정보를 가져오는 주소
const BINDING_URL = "https://zonai.skport.com/api/v1/game/player/binding?gameId=3";

// 실제 출석체크를 하는 주소
const ATTENDANCE_URL = "https://zonai.skport.com/web/v1/game/endfield/attendance";

// 실제 쿠키 이름 적용
const TARGET_COOKIE_NAME = "SK_OAUTH_CRED_KEY"; 

// 세션 연장용(Keep-Alive) 타겟 주소
const MAIN_PAGE_URL = "https://game.skport.com/endfield/sign-in";

// ==========================================

// 1. 쿠키 감지 및 저장 (만료일 포함)
chrome.cookies.onChanged.addListener((changeInfo) => {
  const isTargetDomain = changeInfo.cookie.domain.includes("skport.com");
  const isTargetCookie = changeInfo.cookie.name === TARGET_COOKIE_NAME;

  if (isTargetDomain && isTargetCookie && !changeInfo.removed) {
    chrome.storage.local.set({ 
      'cred': changeInfo.cookie.value, 
      'expirationDate': changeInfo.cookie.expirationDate,
      'hasCookie': true 
    });
    console.log(`[Endfield] 쿠키 갱신됨 (만료: ${new Date(changeInfo.cookie.expirationDate * 1000).toLocaleString()})`);
  }
});

// 공통 헤더 생성 함수
function getHeaders(credValue, role = null) {
  const headers = {
    "accept": "application/json, text/plain, */*",
    "origin": "https://game.skport.com",
    "referer": "https://game.skport.com/",
    "platform": "3",
    "sk-language": "en",
    "cred": credValue // 서버는 헤더 키값으로 'cred'를 원함 (값은 SK_OAUTH_CRED_KEY의 내용)
  };
  
  // 2단계(출석)에서는 캐릭터 정보(role)가 추가로 필요함
  if (role) {
    headers["sk-game-role"] = role;
  }
  
  return headers;
}

// 메인 페이지에 가짜 요청을 보내서 쿠키 수명을 늘림
async function refreshSession(credValue) {
  try {
    console.log("[Endfield] 세션 연장(Keep-Alive) 시도 중...");
    await fetch(MAIN_PAGE_URL, {
      method: "GET",
      headers: getHeaders(credValue)
    });
    // 이 요청이 성공하면 서버가 Set-Cookie 헤더를 줘서 브라우저 쿠키가 갱신될 수 있음
    console.log("[Endfield] 세션 연장 요청 완료");
  } catch (e) {
    console.log("[Endfield] 세션 연장 요청 실패 (무시하고 진행)");
  }
}

// 1단계: 캐릭터 정보 조회
async function fetchRole(credValue) {
  const response = await fetch(BINDING_URL, {
    method: "GET",
    headers: getHeaders(credValue)
  });
  const data = await response.json();

  if (data.code === 0 && data.data?.list?.[0]?.bindingList?.[0]?.roles?.[0]) {
    const roleData = data.data.list[0].bindingList[0].roles[0];
    return `3_${roleData.roleId}_${roleData.serverId}`;
  }
  throw new Error("캐릭터 정보를 찾을 수 없습니다.");
}

// 2단계: 출석체크 실행 (메인 엔진)
async function doCheckIn() {
  const storage = await chrome.storage.local.get('cred');
  const credValue = storage.cred;

  if (!credValue) {
    saveLog("❌ 실패: 로그인 정보 없음");
    return;
  }

  try {
    // 출석 전에 세션 연장부터 시도
    await refreshSession(credValue);

    // 1. 캐릭터 정보 확인
    const role = await fetchRole(credValue);
    
    // 2. 오늘 이미 출석했는지 확인
    const checkRes = await fetch(ATTENDANCE_URL, {
      method: "GET",
      headers: getHeaders(credValue, role)
    });
    const checkData = await checkRes.json();

    if (checkData.code === 0 && checkData.data?.hasToday) {
      saveLog("✅ 이미 출석 완료됨");
      return;
    }

    // 3. 출석 요청 (POST)
    const postRes = await fetch(ATTENDANCE_URL, {
      method: "POST",
      headers: { ...getHeaders(credValue, role), "content-type": "application/json" },
      body: JSON.stringify({})
    });
    const postData = await postRes.json();

    if (postData.code === 0 || postData.code === 10001) {
      saveLog(`✅ 출석 성공! (${new Date().toLocaleTimeString()})`);
    } else {
      saveLog(`⚠️ 실패: ${postData.message} (Code: ${postData.code})`);
    }

  } catch (error) {
    saveLog(`🔥 에러: ${error.message}`);
  }
}

function saveLog(msg) {
  chrome.storage.local.set({ 'lastLog': msg });
  chrome.runtime.sendMessage({ action: "UI_UPDATE" }).catch(() => {});
  console.log(msg);
}

// 스케줄러 & 트리거
chrome.alarms.create("dailyCheck", { periodInMinutes: 1440 });

chrome.alarms.onAlarm.addListener((alarm) => { 
  if (alarm.name === "dailyCheck") doCheckIn(); 
});

chrome.runtime.onStartup.addListener(() => {
  setTimeout(doCheckIn, 5000); // 5초 딜레이
});

chrome.runtime.onMessage.addListener((req) => { 
  if (req.action === "MANUAL_CHECKIN") doCheckIn(); 
});

// ==========================================
// [1] 설정 영역
// ==========================================

// 캐릭터(Role) 정보를 가져오는 주소
const BINDING_URL = "https://zonai.skport.com/api/v1/game/player/binding?gameId=3";

// 실제 출석체크를 하는 주소
const ATTENDANCE_URL = "https://zonai.skport.com/web/v1/game/endfield/attendance";

// 실제 쿠키 이름 적용
const TARGET_COOKIE_NAME = "SK_OAUTH_CRED_KEY"; 

// ==========================================

// 1. 쿠키 감지 및 저장 (자동 갱신 로직)
chrome.cookies.onChanged.addListener((changeInfo) => {
  // skport.com 도메인에서 우리가 찾는 쿠키 이름이 변경되었는지 감시
  const isTargetDomain = changeInfo.cookie.domain.includes("skport.com");
  const isTargetCookie = changeInfo.cookie.name === TARGET_COOKIE_NAME;

  if (isTargetDomain && isTargetCookie && !changeInfo.removed) {
    // 쿠키 값을 'cred'라는 이름으로 저장소에 보관
    chrome.storage.local.set({ 
      'cred': changeInfo.cookie.value, 
      'hasCookie': true 
    });
    console.log(`[Endfield] 쿠키(${TARGET_COOKIE_NAME})가 갱신되었습니다.`);
  }
});

// 공통 헤더 생성 함수 (GAS 코드 기반)
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

// 1단계: 캐릭터 정보(Role ID) 조회
async function fetchRole(credValue) {
  const response = await fetch(BINDING_URL, {
    method: "GET",
    headers: getHeaders(credValue)
  });
  const data = await response.json();

  // 응답 데이터 구조 파싱 (GAS 코드 로직 따름)
  if (data.code === 0 && data.data?.list?.[0]?.bindingList?.[0]?.roles?.[0]) {
    const roleData = data.data.list[0].bindingList[0].roles[0];
    // role ID 조합
    return `3_${roleData.roleId}_${roleData.serverId}`;
  }
  throw new Error("캐릭터 정보를 찾을 수 없습니다. (Role Binding Not Found)");
}

// 2단계: 출석체크 실행 (메인 엔진)
async function doCheckIn() {
  // 저장된 토큰 꺼내오기
  const storage = await chrome.storage.local.get('cred');
  const credValue = storage.cred;

  if (!credValue) {
    saveLog("❌ 실패: 로그인 정보 없음. skport.com 로그인 필요");
    return;
  }

  try {
    // 1. 캐릭터 정보 확인
    const role = await fetchRole(credValue);
    
    // 2. 오늘 이미 출석했는지 확인 (GET 요청)
    const checkRes = await fetch(ATTENDANCE_URL, {
      method: "GET",
      headers: getHeaders(credValue, role)
    });
    const checkData = await checkRes.json();

    if (checkData.code === 0 && checkData.data?.hasToday) {
      saveLog("✅ 이미 출석 완료됨 (Today Checked)");
      return;
    }

    // 3. 출석 요청 보내기 (POST 요청)
    const postRes = await fetch(ATTENDANCE_URL, {
      method: "POST",
      headers: { 
        ...getHeaders(credValue, role),
        "content-type": "application/json" 
      },
      body: JSON.stringify({}) // 빈 객체 전송
    });
    const postData = await postRes.json();

    // 4. 결과 판별 (code 0 또는 10001은 성공으로 간주)
    if (postData.code === 0 || postData.code === 10001) {
      saveLog(`✅ 출석 성공! (${new Date().toLocaleTimeString()})`);
    } else {
      saveLog(`⚠️ 실패: ${postData.message || "알 수 없는 오류"} (Code: ${postData.code})`);
    }

  } catch (error) {
    saveLog(`🔥 에러: ${error.message}`);
  }
}

// 로그 저장 및 팝업 UI 업데이트 알림
function saveLog(msg) {
  chrome.storage.local.set({ 'lastLog': msg });
  chrome.runtime.sendMessage({ action: "UI_UPDATE" }).catch(() => {});
  console.log(msg);
}

// (1) 알람 설정: 1440분(24시간)마다 울림
chrome.alarms.get("dailyCheck", (alarm) => {
  if (!alarm) {
    chrome.alarms.create("dailyCheck", { periodInMinutes: 1440 });
  }
});

// (2) 알람이 울리면 실행 (켜져 있을 때 or 켜자마자 밀린 것 실행)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "dailyCheck") {
    console.log("[Endfield] 알람 트리거 작동");
    doCheckIn();
  }
});

// (3) 컴퓨터를 켜고 크롬을 처음 실행할 때 체크합니다.
chrome.runtime.onStartup.addListener(() => {
  console.log("[Endfield] 브라우저 시작 트리거 작동");
  // 딜레이를 3초 정도 줘서 인터넷 연결 안정화 후 실행
  setTimeout(doCheckIn, 3000); 
});

// (4) 수동 실행 리스너 (팝업 버튼)
chrome.runtime.onMessage.addListener((req) => {
  if (req.action === "MANUAL_CHECKIN") doCheckIn();
});
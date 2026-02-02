console.log("[Endfield] 스마트 감지 모드 시작 🕵️");

let hasClicked = false; // 중복 클릭 방지
let observer = null;

function tryClickButton() {
  if (hasClicked) return true; // 이미 눌렀으면 종료

  // (A) 텍스트로 버튼 찾기 ("출석", "수령", "Check-in" 등)
  const candidates = document.querySelectorAll('button, div[role="button"], div[class*="btn"], div[class*="button"]');
  
  for (let el of candidates) {
    const text = el.innerText || "";
    if (text.includes("출석") || text.includes("수령") || text.includes("Check-in")) {
      if (el.offsetParent !== null) { // 화면에 보이는 것만
        console.log("✅ 텍스트 버튼 발견! 즉시 클릭:", text);
        clickElement(el);
        return true;
      }
    }
  }

  // (B) 이미지(Lottie) 구조로 찾기
  const lottieContainer = document.getElementById('lottie-container');
  if (lottieContainer) {
    console.log("✅ 오늘 날짜(Lottie) 발견! 클릭 시도");
    clickElement(lottieContainer);
    if (lottieContainer.parentElement) clickElement(lottieContainer.parentElement);
    return true;
  }

  // (C) 이미 출석된 상태인지 확인
  if (document.body.innerText.includes("이미 출석") || document.body.innerText.includes("Checked in")) {
    reportSuccess("✅ 이미 출석 완료된 상태입니다.");
    hasClicked = true;
    return true;
  }

  return false; // 아직 못 찾음
}

function clickElement(el) {
  hasClicked = true;
  el.click(); // 1차 클릭
  setTimeout(() => el.click(), 100); // 0.1초 뒤 확인 사살 클릭
  
  reportSuccess("✅ 버튼 클릭 완료!");
  if (observer) observer.disconnect();
}

// 3. MutationObserver: 화면 변화 감지기
function startObserver() {
  if (tryClickButton()) return;

  observer = new MutationObserver((mutations) => {
    if (tryClickButton()) {
      observer.disconnect();
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // 15초 타임아웃
  setTimeout(() => {
    if (!hasClicked) {
      if (observer) observer.disconnect();
      reportFailure("⚠️ 15초 동안 버튼을 찾지 못했습니다. (타임아웃)");
    }
  }, 15000);
}

// 4. 성공/실패 보고
function reportSuccess(msg) {
  console.log(msg);
  chrome.runtime.sendMessage({ action: "CHECKIN_COMPLETED", message: msg });
}

function reportFailure(msg) {
  console.error(msg);
  chrome.runtime.sendMessage({ action: "CHECKIN_FAILED", message: msg });
}

// 실행
startObserver();
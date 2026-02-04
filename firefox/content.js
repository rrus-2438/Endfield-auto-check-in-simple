console.log("[Endfield Clicker] 스마트 감지 모드 시작 🕵️");

let hasClicked = false;
let observer = null;
let loginCheckTimer = null; // ★ 깜빡임 방지용 타이머

function isVisible(el) {
  return el && el.offsetParent !== null;
}

function tryClickButton() {
  if (hasClicked) return true;

  // ====================================================
  // 1. 로그인 화면 감지
  // ====================================================
  const emailInput = document.querySelector('input[name="email"]');
  const passwordInput = document.querySelector('input[type="password"]');

  // 화면에 보이는 로그인 입력창이 있는지 확인
  const isLoginPage = (
    (emailInput && isVisible(emailInput)) || 
    (passwordInput && isVisible(passwordInput))
  );

  if (isLoginPage) {
    // 처음 발견했으면 타이머 시작 (바로 신고 안 함!)
    if (loginCheckTimer === null) {
      console.log("🤔 로그인 화면 감지됨. 진짜인지 2초간 지켜봅니다...");
      loginCheckTimer = setTimeout(() => {
        // 2초 뒤에 다시 확인
        const emailNow = document.querySelector('input[name="email"]');
        if (emailNow && isVisible(emailNow)) {
             console.log("🚨 (확정) 2초 뒤에도 로그인 화면임. 신고 전송!");
             reportFailure("LOGIN_REQUIRED");
             hasClicked = true;
        }
        loginCheckTimer = null; 
      }, 2000); // 2초 대기
    }
    return false; // 아직 확정 아니니 계속 감시
  } else {
    // 로그인 화면이 아니라고 판단되면 타이머 취소 (페이지 로딩 중 잠깐 떴던 것임)
    if (loginCheckTimer !== null) {
      console.log("😅 로그인 화면이 사라졌습니다. (로딩 중 깜빡임이었음)");
      clearTimeout(loginCheckTimer);
      loginCheckTimer = null;
    }
  }

  // ====================================================
  // 2. 출석 버튼 찾기
  // ====================================================
  
  // (A) 텍스트로 찾기
  const candidates = document.querySelectorAll('button, div[role="button"], div[class*="btn"], div[class*="button"]');
  for (let el of candidates) {
    const text = el.innerText || "";
    if ((text.includes("출석") || text.includes("수령") || text.includes("Check-in")) && !text.includes("로그인")) {
      if (isVisible(el)) { 
        console.log("✅ 텍스트 버튼 발견! 즉시 클릭:", text);
        clickElement(el);
        return true;
      }
    }
  }

  // (B) 이미지(Lottie) 구조로 찾기
  const lottieContainer = document.getElementById('lottie-container');
  if (lottieContainer && isVisible(lottieContainer)) {
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

  return false;
}

function clickElement(el) {
  hasClicked = true;
  el.click();
  setTimeout(() => el.click(), 100);
  reportSuccess("✅ 버튼 클릭 완료!");
  if (observer) observer.disconnect();
}

function startObserver() {
  if (tryClickButton()) return;

  observer = new MutationObserver((mutations) => {
    if (tryClickButton()) observer.disconnect();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(() => {
    if (!hasClicked) {
      if (observer) observer.disconnect();
      // 시간 초과 시, 마지막으로 한번 더 로그인 체크
      const emailInput = document.querySelector('input[name="email"]');
      if (emailInput && isVisible(emailInput)) {
        reportFailure("LOGIN_REQUIRED");
      } else {
        reportFailure("⚠️ 버튼을 못 찾음 (타임아웃)");
      }
    }
  }, 15000);
}

function reportSuccess(msg) {
  chrome.runtime.sendMessage({ action: "CHECKIN_COMPLETED", message: msg });
}

function reportFailure(msg) {
  chrome.runtime.sendMessage({ action: "CHECKIN_FAILED", message: msg });
}

startObserver();
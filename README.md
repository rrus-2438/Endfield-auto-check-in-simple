# 🚀 Endfield (SKPort) Auto Check-in

엔드필드(Endfield) / SKPort 플랫폼의 일일 출석체크를 자동으로 수행하는 브라우저 확장프로그램입니다.  
브라우저를 켤 때와 매일 밤 1시 5분에 작동합니다.

## ✨ 주요 기능

* **🍪 스마트 쿠키 동기화:** SKPort 웹사이트에 로그인하면 확장프로그램이 자동으로 인증 정보를 감지하여 저장합니다. 별도의 설정이 필요 없습니다.
* **⚡ 브라우저 시작 시 자동 실행:** 크롬 브라우저를 켜면 즉시 백그라운드에서 출석체크를 시도합니다. (놓침 방지)
* **⏰ 24시간 자동 스케줄러:** 브라우저가 켜져 있다면 매일 정해진 시간에 자동으로 출석을 수행합니다.
* **👤 캐릭터 자동 감지:** 계정에 연동된 캐릭터(Role ID) 정보를 자동으로 조회하여 출석체크에 사용합니다.

## 📦 설치 방법 (Download & Install)

이 프로그램은 **Chrome**과 **Firefox**를 모두 지원합니다.  
우측의 **[Releases]** 페이지에서 브라우저에 맞는 파일을 다운로드하세요.

### 1. Chrome (크롬)
1. `Endfield-Chrome-vX.X.X.zip` 다운로드 및 압축 해제.
2. 주소창에 `chrome://extensions` 접속 → **개발자 모드** 켜기.
3. **'압축해제된 확장 프로그램을 로드합니다'** 클릭 후 폴더 선택.
<img width="859" height="118" alt="image" src="https://github.com/user-attachments/assets/65ea87ef-eef9-4331-9562-850f4caa9bab" />  

### 2. Firefox (파이어폭스)
1. `Endfield-Firefox-vX.X.X.zip` 다운로드 및 압축 해제.
2. 주소창에 `about:addons` 접속.
3. 오른쪽 톱니바퀴 메뉴 클릭.
4. **'파일에서 부가 기능 설치'** 버튼 클릭.
5. 다운받은 Endfield-Firefox-vX.X.X.xpi 선택


## 🛠️ 사용 방법 (초기 설정)

설치 직후에는 로그인 정보가 없으므로 다음 과정을 한 번 수행해야 합니다.

1.  확장프로그램 설치를 마칩니다.
2.  [엔드필드 출석 체크](https://game.skport.com/endfield/sign-in)에 접속하여 **로그인**합니다.
3.  확장프로그램 아이콘을 클릭합니다.
4.  **"로그인 세션 (Cookie): 연동 완료 (OK)"** 라고 뜨는지 확인합니다.
5.  **"지금 수동으로 출석하기"** 버튼을 눌러 정상 작동하는지 테스트합니다.

이후에는 브라우저를 켜기만 해도 자동으로 출석체크가 진행됩니다. (로그인이 풀린 경우 다시 사이트에 접속해주면 됩니다.)

## ⚠️ 기술 정보 & 주의사항

* **Target Site:** `skport.com` (Gryphline/Endfield Global)
* **Cookie Name:** `SK_OAUTH_CRED_KEY`
* **Permissions:**
    * `cookies`: 인증 토큰 획득용
    * `alarms`: 자동 스케줄링용
    * `storage`: 토큰 및 로그 저장용

> **Note:** 이 프로젝트는 개인 학습 및 편의를 위해 제작되었습니다. 비정상적인 이용은 제재의 대상이 될 수 있으며, 모든 책임은 사용자에게 있습니다.


## 제작에 참고한 사이트

https://github.com/4n3u/Endfield-CheckIn-Auto/blob/main/main.gs  
https://github.com/j2i5ll/hoyoverse-checkin

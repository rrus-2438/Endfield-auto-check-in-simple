console.log("[Endfield Content] 배달부 대기 중... 📦");

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENDFIELD_ROLE_DETECTED") {
    return;
  }

  console.log("[Endfield Content] 📨 스파이에게서 편지 도착!");

  const data = event.data.payload;
  
  try {
    // [수정됨] gameId 대신 'appCode'로 엔드필드를 확실하게 찾음
    const appData = data.data.list.find(app => app.appCode === 'endfield');
    
    if (appData && appData.bindingList && appData.bindingList.length > 0) {
      const binding = appData.bindingList[0];
      
      let roleId = null;
      let serverId = null;

      if (binding.defaultRole) {
        roleId = binding.defaultRole.roleId;
        serverId = binding.defaultRole.serverId;
      } else if (binding.roles && binding.roles.length > 0) {
        roleId = binding.roles[0].roleId;
        serverId = binding.roles[0].serverId;
      }

      if (roleId && serverId) {
        // 백그라운드로 전송
        chrome.runtime.sendMessage({
          action: "SAVE_USER_INFO",
          roleId: roleId,
          serverId: serverId
        }, (response) => {
           if (chrome.runtime.lastError) {
             console.error("[Endfield Content] ❌ 전송 실패 (확장프로그램 재시작 필요):", chrome.runtime.lastError);
           } else {
             console.log(`[Endfield Content] 🚀 백그라운드로 전송 완료! (ID: ${roleId})`);
           }
        });
      } else {
        console.log("[Endfield Content] ⚠️ 엔드필드 데이터는 찾았으나 캐릭터(Role)가 없습니다.", binding);
      }
    } else {
      console.log("[Endfield Content] ⚠️ 엔드필드(endfield) 앱 정보를 찾을 수 없습니다. 데이터 구조가 다를 수 있습니다.");
      console.log("받은 데이터:", data.data.list); // 디버깅용 로그
    }
  } catch (e) {
    console.error("[Endfield Content] 🔥 파싱 에러:", e);
  }
});
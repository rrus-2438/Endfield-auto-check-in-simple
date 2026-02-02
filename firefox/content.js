console.log("[Endfield Content] 배달부 대기 중... 🦊");

window.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENDFIELD_ROLE_DETECTED") return;

  const data = event.data.payload;
  try {
    const appData = data.data.list.find(app => app.appCode === 'endfield');
    if (appData && appData.bindingList && appData.bindingList.length > 0) {
      const binding = appData.bindingList[0];
      let roleId = binding.defaultRole?.roleId || binding.roles?.[0]?.roleId;
      let serverId = binding.defaultRole?.serverId || binding.roles?.[0]?.serverId;

      if (roleId && serverId) {
        chrome.runtime.sendMessage({
          action: "SAVE_USER_INFO",
          roleId: roleId,
          serverId: serverId
        }, () => {
             if (!chrome.runtime.lastError) {
               console.log(`[Endfield Content] 전송 완료! (ID: ${roleId})`);
             }
        });
      }
    }
  } catch (e) {}
});
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "gistifySelection",
        title: "Gistify this selection",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "gistifySelection") {
        chrome.tabs.sendMessage(tab.id, {
            action: "gistify",
            text: info.selectionText
        });
    }
});

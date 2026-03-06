document.getElementById('startBtn').addEventListener('click', () => {
    const s = document.getElementById('startDate').value;
    const e = document.getElementById('endDate').value;

    if (!s || !e) {
        alert("Укажите обе даты!");
        return;
    }

    chrome.storage.local.set({
        running: true,
        currentIndex: 0,
        startDate: s,
        endDate: e,
        results: {}
    }, () => {
        chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
            if (tabs[0]) chrome.tabs.reload(tabs[0].id);
            window.close();
        });
    });
});

document.getElementById('stopBtn').addEventListener('click', () => {
    chrome.storage.local.set({ running: false }, () => {
        alert("Скрипт остановлен");
    });
});
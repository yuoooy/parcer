const STAGES = [
    "Осуществление миграционного учета в Российской Федерации",
    "Государственная услуга по оформлению и выдаче заграничных паспортов со сроком действия 5 лет",
    "Добровольная дактилоскопическая регистрация",
    "Регистрационный учет по месту жительства или пребывания",
    "Предоставление адресно-справочной информации",
    "Получение внутреннего паспорта",
    "Оформление и выдача приглашений на въезд в Российскую Федерацию",
    "Иные услуги и сервисы МВД России",
    "Выдача иностранным гражданам и лицам без гражданства вида на жительство",
    "личный прием руководителя",
    "Дополнительные услуги",
    "Выдача иностранному гражданину и лицу без гражданства разрешения на временное проживание",
    "Локальные услуги",
    "Локальная услуга",
    "Оформление гражданства",
    "прием по вопросам гражданства РФ",
    "Оформление и выдача патента",
    "Визы для иностранных граждан",
    "Выдача разрешений на привлечение и использование иностранных работников"
];

document.addEventListener('DOMContentLoaded', () => {
    // Восстанавливаем прошлый ввод
    chrome.storage.local.get(['startDate', 'endDate', 'ovdName'], (d) => {
        if (d.startDate) document.getElementById('startDate').value = d.startDate;
        if (d.endDate) document.getElementById('endDate').value = d.endDate;
        if (d.ovdName) document.getElementById('ovdName').value = d.ovdName;
    });

    // Запуск
    document.getElementById('startBtn').onclick = () => {
        const ovd = document.getElementById('ovdName').value.trim();
        if (!ovd) return alert("Обязательно укажите название района!");

        chrome.storage.local.get(['allData'], (res) => {
            const db = res.allData || {}; // Берем старую базу, если она есть
            
            chrome.storage.local.set({
                running: true,
                currentOvd: ovd,
                currentIndex: 0, // Начинаем с первой услуги
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                allData: db
            }, () => {
                // Обновляем страницу для старта content.js
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    chrome.tabs.reload(tabs[0].id);
                    window.close();
                });
            });
        });
    };

    // Скачивание
    document.getElementById('downloadBtn').onclick = () => {
        chrome.storage.local.get(['allData'], (res) => {
            const db = res.allData || {};
            if (Object.keys(db).length === 0) return alert("Нет данных для скачивания.");

            let csv = "\uFEFFРайон;" + STAGES.join(";") + "\n";
            for (let district in db) {
                let row = [district];
                STAGES.forEach(stage => {
                    row.push(db[district][stage] || "0");
                });
                csv += row.join(";") + "\n";
            }

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.download = "Сводный_Отчет_МВД.csv";
            link.click();
        });
    };

    // Очистка
    document.getElementById('clearBtn').onclick = () => {
        if (confirm("Вы уверены, что хотите удалить ВСЕ собранные данные?")) {
            chrome.storage.local.set({ allData: {}, running: false });
            alert("Память очищена.");
        }
    };
});
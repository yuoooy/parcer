(function() {
    'use strict';

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

    chrome.storage.local.get(['running', 'currentIndex', 'currentOvd', 'allData', 'startDate', 'endDate'], async (state) => {
        if (!state || !state.running) return;

        let db = state.allData || {};
        let district = state.currentOvd || "Неизвестно";
        if (!db[district]) db[district] = {};

        console.log("🚀 Запуск скоростного сбора для района:", district);

        // Функция задержки
        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        // Функция парсинга текущего числа
        const getCount = () => {
            const nav = document.querySelector('nav.pagination');
            if (!nav) return "0";
            const b = nav.querySelectorAll('b');
            return b.length >= 3 ? b[2].innerText.replace(/\D/g, '') : (b.length > 0 ? b[b.length-1].innerText.replace(/\D/g, '') : "0");
        };

        // ОСНОВНОЙ ЦИКЛ (проходим по всем этапам без перезагрузки)
        for (let i = state.currentIndex; i < STAGES.length; i++) {
            const currentStage = STAGES[i];
            console.log(`🔎 Обработка [${i + 1}/${STAGES.length}]: ${currentStage}`);

            // 1. Установка дат (на всякий случай обновляем каждый раз)
            const sInp = document.getElementById('start_date');
            const eInp = document.getElementById('end_date');
            if (sInp) sInp.value = state.startDate;
            if (eInp) eInp.value = state.endDate;

            // 2. Сброс всех чекбоксов
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            // 3. Выбор базы (EPGU, Ready)
            const epgu = document.querySelector('input[value="EPGU"]');
            if (epgu) { epgu.checked = true; epgu.dispatchEvent(new Event('change', {bubbles: true})); }
            const ready = document.querySelector('input[value="ready"]');
            if (ready) { ready.checked = true; ready.dispatchEvent(new Event('change', {bubbles: true})); }

            // 4. Поиск нужной услуги
            let found = false;
            const labels = document.querySelectorAll('.tree-multiselect .item, .tree-multiselect .title, label');
            for (let label of labels) {
                if (label.textContent.trim().includes(currentStage)) {
                    const cb = label.querySelector('input[type="checkbox"]') || label.closest('div')?.querySelector('input[type="checkbox"]');
                    if (cb) {
                        cb.checked = true;
                        cb.dispatchEvent(new Event('change', {bubbles: true}));
                        found = true;
                        break;
                    }
                }
            }

            if (found) {
                const btn = document.querySelector('button.btn-primary[type="submit"]');
                if (btn) {
                    btn.click(); // Нажимаем "Применить"
                    
                    // Ждем обновления данных (обычно сайт МВД думает 1-2 секунды)
                    // Если сайт очень быстрый, можно уменьшить до 1000
                    await sleep(1800); 
                    
                    db[district][currentStage] = getCount();
                }
            } else {
                console.log("⏭️ Услуга не найдена, пропускаем.");
                db[district][currentStage] = "-";
            }

            // Сохраняем промежуточный результат в память после каждого шага
            await chrome.storage.local.set({ currentIndex: i + 1, allData: db });
            console.log(`✅ Результат записан: ${db[district][currentStage]}`);
        }

        // ФИНИШ
        chrome.storage.local.set({ running: false }, () => {
            alert(`🎉 Сбор для "${district}" полностью завершен!`);
        });
    });
})();
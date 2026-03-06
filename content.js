(function() {
    'use strict';

    const STAGES = [
        "Осуществление миграционного учета в Российской Федерации",
        "Государственная услуга по оформлению и выдаче заграничных паспортов со сроком действия 5 лет",
        "Добровольная дактилоскопическая регистрация",
        "Регистрационный учет по месту жительства или пребывания",
        "Предоставление адресно-справочной информации",
        "Получение внутреннего паспорта (Группа 1)",
        "Получение внутреннего паспорта (Группа 2)",
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

    const GROUP_1_KEYS = [
        "изменения фамилии", "14-летнего возраста", "непригодности", 
        "изменения внешности", "20 или 45 лет", "изменения пола", 
        "Оформление (замена) паспорта", "изменением установочных данных", 
        "Выдача готового паспорта"
    ];

    chrome.storage.local.get(['running', 'currentIndex', 'currentOvd', 'allData', 'startDate', 'endDate'], async (state) => {
        if (!state || !state.running) return;

        let db = state.allData || {};
        let district = state.currentOvd || "Неизвестно";
        if (!db[district]) db[district] = {};

        const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        const getCount = () => {
            const nav = document.querySelector('nav.pagination');
            if (!nav) return "0";
            const b = nav.querySelectorAll('b');
            return b.length >= 3 ? b[2].innerText.replace(/\D/g, '') : (b.length > 0 ? b[b.length-1].innerText.replace(/\D/g, '') : "0");
        };

        for (let i = state.currentIndex; i < STAGES.length; i++) {
            const currentStage = STAGES[i];
            console.log(`🔎 Шаг ${i+1}/${STAGES.length}: ${currentStage}`);

            // 1. Предварительная настройка дат
            const sInp = document.getElementById('start_date');
            const eInp = document.getElementById('end_date');
            if (sInp) sInp.value = state.startDate;
            if (eInp) eInp.value = state.endDate;

            // 2. Сброс всех чекбоксов
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);

            // 3. Базовые фильтры (ЕПГУ и Готов)
            const epgu = document.querySelector('input[value="EPGU"]');
            if (epgu) { epgu.checked = true; epgu.dispatchEvent(new Event('change', {bubbles: true})); }
            const ready = document.querySelector('input[value="ready"]');
            if (ready) { ready.checked = true; ready.dispatchEvent(new Event('change', {bubbles: true})); }

            let stageFound = false;

            // === ЛОГИКА ДЛЯ ПАСПОРТА ===
            if (currentStage.includes("Получение внутреннего паспорта")) {
                let container = null;
                const labels = document.querySelectorAll('.item, .title, label');
                
                // Ищем папку паспорта
                for (let lbl of labels) {
                    if (lbl.textContent.trim().includes("Получение внутреннего паспорта")) {
                        container = lbl.closest('.tree-multiselect-section') || lbl.parentElement;
                        // Если список закрыт (есть плюс), открываем его
                        const plus = container.querySelector('.collapse-section.glyphicon-plus');
                        if (plus) {
                            plus.click();
                            await sleep(600);}
                        break;
                    }
                }

                if (container) {
                    const subItems = container.querySelectorAll('input[type="checkbox"]');
                    subItems.forEach(cb => {
                        const txt = cb.parentElement.textContent.trim();
                        // Игнорируем сам заголовок секции
                        if (txt === "Получение внутреннего паспорта") return;

                        const isG1 = GROUP_1_KEYS.some(k => txt.toLowerCase().includes(k.toLowerCase()));

                        if (currentStage.includes("Группа 1")) {
                            if (isG1) {
                                cb.checked = true;
                                cb.dispatchEvent(new Event('change', {bubbles: true}));
                                stageFound = true;
                            }
                        } else {
                            // ГРУППА 2: Если НЕ входит в G1, значит выбираем
                            if (!isG1) {
                                cb.checked = true;
                                cb.dispatchEvent(new Event('change', {bubbles: true}));
                                stageFound = true;
                            }
                        }
                    });
                }
            } 
            // === ЛОГИКА ДЛЯ ВСЕХ ОСТАЛЬНЫХ УСЛУГ ===
            else {
                const labels = document.querySelectorAll('.tree-multiselect .item, .tree-multiselect .title, label');
                for (let label of labels) {
                    if (label.textContent.trim().includes(currentStage)) {
                        const cb = label.querySelector('input[type="checkbox"]') || label.closest('div')?.querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.checked = true;
                            cb.dispatchEvent(new Event('change', {bubbles: true}));
                            stageFound = true;
                            break;
                        }
                    }
                }
            }

            // === ЗАПИСЬ РЕЗУЛЬТАТА ===
            const btn = document.querySelector('button.btn-primary[type="submit"]');
            
            if (stageFound && btn) {
                btn.click();
                await sleep(2200); // Ожидание загрузки цифр
                db[district][currentStage] = getCount();
                console.log(`✅ Найдено: ${db[district][currentStage]}`);
            } else {
                // Если фильтр не найден на странице
                db[district][currentStage] = "-";
                console.log(`⏭️ Фильтр "${currentStage}" не найден, пишу прочерк.`);
            }

            // Сохраняем прогресс после каждого шага
            await chrome.storage.local.set({ currentIndex: i + 1, allData: db });
        }

        chrome.storage.local.set({ running: false }, () => {
            alert("✨ Сбор завершен! Можно скачивать отчет.");
        });
    });
})();
(function() {
    'use strict';

    const stages = [
        "Осуществление миграционного учета в Российской Федерации",
        "Государственная услуга по оформлению и выдаче заграничных паспортов со сроком действия 5 лет",
        "Добровольная дактилоскопическая регистрация",
        "Регистрационный учет по месту жительства или пребывания",
        "Предоставление адресно-справочной информации",
        "Получение внутреннего паспорта",
        "Оформление и выдача приглашений на въезд в Российскую Федерацию",
        "Иные услуги и сервисы МВД России"
    ];

    chrome.storage.local.get(['running', 'currentIndex', 'startDate', 'endDate', 'results'], (state) => {
        if (!state || !state.running) return;

        // ШАГ 1: Записываем результат, если страница только что обновилась после нажатия "Применить"
        if (state.currentIndex > 0) {
            const previousStageName = stages[state.currentIndex - 1];
            state.results[previousStageName] = extractPaginationCount();
            console.log("Записано для " + previousStageName + ": " + state.results[previousStageName]);
        }

        // ШАГ 2: Проверка на завершение
        if (state.currentIndex >= stages.length) {
            finishAndDownload(state);
            return;
        }

        // ШАГ 3: Установка фильтров для текущего этапа
        // Даем сайту 1.5 секунды полностью "ожить" после загрузки
        setTimeout(() => {
            setupFilters(state);
        }, 1500);
    });

    function setupFilters(state) {
        console.log("Настраиваю фильтры для этапа: " + stages[state.currentIndex]);

        // 1. Установка дат
        const sDate = document.getElementById('start_date');
        const eDate = document.getElementById('end_date');
        if (sDate) sDate.value = state.startDate;
        if (eDate) eDate.value = state.endDate;

        // 2. Очистка всех чекбоксов перед выбором
        document.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });

        // 3. Выбор источника: Запись из ЕПГУ (value="EPGU")
        const epgu = document.querySelector('input[value="EPGU"]');
        if (epgu) {
            epgu.checked = true;
            epgu.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 4. Выбор статуса: Готов (value="ready")
        const ready = document.querySelector('input[value="ready"]');
        if (ready) {
            ready.checked = true;
            ready.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // 5. Выбор конкретного этапа по очереди
        const currentStageName = stages[state.currentIndex];
        const labels = document.querySelectorAll('.tree-multiselect .item, .tree-multiselect .title, label');
        let stageFound = false;

        for (let label of labels) {
            if (label.textContent.trim().includes(currentStageName)) {
                const cb = label.querySelector('input[type="checkbox"]') || label.closest('div')?.querySelector('input[type="checkbox"]');
                if (cb) {
                    cb.checked = true;
                    cb.dispatchEvent(new Event('change', { bubbles: true }));
                    stageFound = true;
                    break;
                }
            }
        }

        if (!stageFound) console.error("НЕ НАЙДЕН ЭТАП: " + currentStageName);

        // ШАГ 4: Сохранение прогресса и нажатие "Применить"
        const nextIndex = state.currentIndex + 1;
        chrome.storage.local.set({ currentIndex: nextIndex, results: state.results }, () => {
            const submitBtn = document.querySelector('button.btn-primary[type="submit"]');
            if (submitBtn) {
                console.log("Нажимаю кнопку Применить...");
                submitBtn.click();
            } else {
                alert("Кнопка фильтра не найдена на странице!");
            }
        });
    }

    function extractPaginationCount() {
        const nav = document.querySelector('nav.pagination');
        if (!nav) return "0";// Ищем последнее жирное число в строке типа "Показаны 1 - 25 из 91"
        const bTags = nav.querySelectorAll('b');
        if (bTags.length > 0) {
            return bTags[bTags.length - 1].innerText.replace(/\D/g, '');
        }
        return "0";
    }

    function finishAndDownload(state) {
        chrome.storage.local.set({ running: false }, () => {
            let csv = "\uFEFFЭтап;Источник;Статус;Количество\n";
            stages.forEach(name => {
                csv += name + ";ЕПГУ;Готов;" + (state.results[name] || 0) + "\n";
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", "Отчет_МВД_" + state.startDate + ".csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            alert("Сбор данных завершен. Файл скачан.");
        });
    }
})();
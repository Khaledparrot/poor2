// ==================== ÉTAT DE L'APPLICATION ====================
let appState = {
    user: {
        age: null,
        weight: null,
        height: null,
        gender: 'male',
        wakeUpTime: '07:00',
        bedTime: '22:00'
    },
    daily: {}, // Stockage par jour
    currentDay: new Date().toISOString().split('T')[0],
    foodDatabase: [
        { id: 1, name: 'Riz', protein: 2.7, carbs: 28, fats: 0.3, fiber: 0.4, calories: 130, unitWeight: null },
        { id: 2, name: 'Poulet', protein: 31, carbs: 0, fats: 3.6, fiber: 0, calories: 165, unitWeight: null },
        { id: 3, name: 'Œuf', protein: 13, carbs: 1.1, fats: 11, fiber: 0, calories: 155, unitWeight: 60 },
        { id: 4, name: 'Pomme', protein: 0.3, carbs: 14, fats: 0.2, fiber: 2.4, calories: 52, unitWeight: 150 },
        { id: 5, name: 'Banane', protein: 1.1, carbs: 23, fats: 0.3, fiber: 2.6, calories: 89, unitWeight: 120 }
    ],
    nextFoodId: 6,
    quantityType: 'weight',
    notifications: [],
    calendarDate: new Date()
};

// ==================== VARIABLES MÉDITATION ====================
let meditationTimer = null;
let meditationSeconds = 300;
let meditationActive = false;
let meditationPaused = false;
let currentMeditationSession = null;

// ==================== INITIALISATION ====================
function saveUserInfo() {
    console.log("saveUserInfo appelée");
    
    const age = document.getElementById('userAge').value;
    const weight = document.getElementById('userWeight').value;
    const height = document.getElementById('userHeight').value;
    const gender = document.getElementById('userGender').value;
    const wakeUpTime = document.getElementById('wakeUpTime').value;
    const bedTime = document.getElementById('bedTime').value;
    
    if (!age || !weight || !height) {
        alert('Veuillez remplir tous les champs');
        return;
    }
    
    appState.user.age = parseInt(age);
    appState.user.weight = parseFloat(weight);
    appState.user.height = parseFloat(height);
    appState.user.gender = gender;
    appState.user.wakeUpTime = wakeUpTime;
    appState.user.bedTime = bedTime;
    
    // Initialiser le jour courant
    if (!appState.daily[appState.currentDay]) {
        appState.daily[appState.currentDay] = createEmptyDay();
    }
    
    // Fermer le modal
    document.getElementById('ageModal').style.display = 'none';
    document.getElementById('mainApp').style.display = 'block';
    
    updateUserInfoDisplay();
    calculateNeeds();
    updateAllDisplays();
    loadFoodSelect();
    updateFoodDatabaseList();
    updateTodayFoodsList();
    startRealTimeUpdates();
    requestNotificationPermission();
    saveState();
}

function createEmptyDay() {
    return {
        date: appState.currentDay,
        sleep: { hours: 0, quality: '' },
        water: 0,
        waterHistory: [],
        foods: [],
        foodHistory: [],
        exercise: { duration: 0, sessions: [] },
        steps: 0,
        meditation: { total: 0, sessions: [] },
        bowel: []
    };
}

function getTodayData() {
    if (!appState.daily[appState.currentDay]) {
        appState.daily[appState.currentDay] = createEmptyDay();
    }
    return appState.daily[appState.currentDay];
}

// ==================== TEMPS RÉEL ====================
function startRealTimeUpdates() {
    // Mise à jour toutes les secondes
    setInterval(() => {
        updateAllDisplays();
        updateDateTime();
        checkDayChange();
    }, 1000);
    
    // Vérifier les notifications toutes les minutes
    setInterval(checkReminders, 60000);
}

function updateDateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    document.getElementById('currentTime').textContent = timeStr;
    document.getElementById('currentDate').textContent = dateStr;
}

function checkDayChange() {
    const today = new Date().toISOString().split('T')[0];
    if (today !== appState.currentDay) {
        // Sauvegarder le rapport du jour précédent
        saveDailyReport(appState.currentDay);
        
        // Nouveau jour
        appState.currentDay = today;
        if (!appState.daily[today]) {
            appState.daily[today] = createEmptyDay();
        }
        
        updateAllDisplays();
        saveState();
    }
}

function saveDailyReport(date) {
    const dayData = appState.daily[date];
    if (!dayData) return;
    
    const scores = calculateDailyScores(dayData);
    dayData.score = scores.global;
    dayData.scores = scores;
    
    saveState();
}

// ==================== NOTIFICATIONS ====================
async function requestNotificationPermission() {
    if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            addNotification('✅ Notifications activées', 'Vous recevrez des rappels');
        }
    }
}

function addNotification(title, message) {
    const time = new Date().toLocaleTimeString();
    appState.notifications.push({ title, message, time, read: false });
    if (appState.notifications.length > 20) {
        appState.notifications.shift();
    }
    updateNotificationBell();
    
    // Notification système
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message });
    }
}

function showNotifications() {
    const panel = document.getElementById('notificationPanel');
    const list = document.getElementById('notificationsList');
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
        return;
    }
    
    let html = '';
    if (appState.notifications.length === 0) {
        html = '<div class="notification-item">Aucune notification</div>';
    } else {
        appState.notifications.forEach(n => {
            html += `<div class="notification-item">
                        <strong>${n.title}</strong>
                        <p>${n.message}</p>
                        <small>${n.time}</small>
                    </div>`;
            n.read = true;
        });
    }
    
    list.innerHTML = html;
    panel.style.display = 'block';
    updateNotificationBell();
}

function closeNotifications() {
    document.getElementById('notificationPanel').style.display = 'none';
}

function updateNotificationBell() {
    const unread = appState.notifications.filter(n => !n.read).length;
    const bell = document.getElementById('notificationBell');
    if (bell) {
        bell.innerHTML = unread > 0 ? `🔔 (${unread})` : '🔔';
    }
}

function checkReminders() {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const today = getTodayData();
    
    // Rappel d'eau toutes les heures si < 70%
    const waterPercent = (today.water / appState.waterTarget) * 100;
    if (waterPercent < 70 && now.getMinutes() === 0) {
        addNotification('💧 Rappel d\'eau', 'Pensez à boire de l\'eau');
    }
    
    // Rappel protéines à 12h et 19h
    if ((currentTime === '12:00' || currentTime === '19:00')) {
        const protein = today.foods.reduce((s, f) => s + f.protein, 0);
        if (protein < appState.proteinTarget * 0.5) {
            addNotification('🥩 Rappel protéines', 'Vous n\'avez pas assez mangé de protéines');
        }
    }
    
    // Rappel coucher
    if (currentTime === appState.user.bedTime) {
        addNotification('😴 Heure du coucher', 'Pensez à aller dormir');
    }
    
    // Rappel méditation à 18h
    if (currentTime === '18:00') {
        addNotification('🧘 Méditation', 'Prenez 10 minutes pour méditer');
    }
}

// ==================== CALCULS ====================
function calculateNeeds() {
    if (!appState.user.weight) return;
    
    const weight = appState.user.weight;
    const age = appState.user.age;
    const gender = appState.user.gender;
    
    // Sommeil
    if (age < 18) appState.sleepTarget = 9;
    else if (age < 65) appState.sleepTarget = 8;
    else appState.sleepTarget = 7.5;
    
    // Eau
    appState.waterTarget = Math.round(weight * 35);
    
    // Protéines
    appState.proteinTarget = Math.round(weight * 0.8);
    
    // Glucides
    appState.carbsTarget = Math.round(weight * 4);
    
    // Lipides
    appState.fatsTarget = Math.round(weight * 1);
    
    // Fibres
    appState.fiberTarget = gender === 'male' ? 35 : 28;
    
    // Mise à jour affichage
    const elements = {
        'sleepTarget': appState.sleepTarget + 'h',
        'waterTarget': appState.waterTarget,
        'proteinNeeded': appState.proteinTarget,
        'carbsNeeded': appState.carbsTarget,
        'fatsNeeded': appState.fatsTarget,
        'fiberNeeded': appState.fiberTarget
    };
    
    for (let id in elements) {
        let el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    }
}

function calculateDailyScores(dayData) {
    const waterScore = Math.min((dayData.water / appState.waterTarget) * 100, 100);
    
    const protein = dayData.foods.reduce((s, f) => s + f.protein, 0);
    const proteinScore = Math.min((protein / appState.proteinTarget) * 100, 100);
    
    const activityScore = Math.min(
        ((dayData.steps / 8000) * 50) + ((dayData.exercise.duration / 30) * 50), 
        100
    );
    
    const sleepScore = Math.min((dayData.sleep.hours / appState.sleepTarget) * 100, 100);
    const meditationScore = Math.min((dayData.meditation.total / 10) * 100, 100);
    const colonScore = dayData.bowel.length > 0 ? 50 : 0;
    
    const global = Math.round(
        (waterScore + proteinScore + activityScore + sleepScore + meditationScore + colonScore) / 6
    );
    
    return {
        water: Math.round(waterScore),
        protein: Math.round(proteinScore),
        activity: Math.round(activityScore),
        sleep: Math.round(sleepScore),
        meditation: Math.round(meditationScore),
        colon: colonScore,
        global: global
    };
}

// ==================== MISE À JOUR AFFICHAGE ====================
function updateAllDisplays() {
    const today = getTodayData();
    
    updateNutritionDisplay(today);
    updateWaterDisplay(today);
    updateActivityDisplay(today);
    updateSleepDisplay(today);
    updateMeditationDisplay(today);
    updateColonDisplay(today);
    updateGlobalScore(today);
    updateRecommendations(today);
    
    // Animation
    document.querySelector('.real-time-indicator').classList.add('updated');
    setTimeout(() => {
        document.querySelector('.real-time-indicator').classList.remove('updated');
    }, 500);
}

function updateNutritionDisplay(today) {
    let protein = 0, carbs = 0, fats = 0, fiber = 0;
    
    today.foods.forEach(food => {
        protein += food.protein || 0;
        carbs += food.carbs || 0;
        fats += food.fats || 0;
        fiber += food.fiber || 0;
    });
    
    setText('proteinEaten', Math.round(protein));
    setText('carbsEaten', Math.round(carbs));
    setText('fatsEaten', Math.round(fats));
    setText('fiberEaten', Math.round(fiber));
    
    setWidth('proteinBar', (protein / appState.proteinTarget) * 100);
    setWidth('carbsBar', (carbs / appState.carbsTarget) * 100);
    setWidth('fatsBar', (fats / appState.fatsTarget) * 100);
    setWidth('fiberBar', (fiber / appState.fiberTarget) * 100);
    
    let avgPercent = ((protein / appState.proteinTarget) + 
                     (carbs / appState.carbsTarget) + 
                     (fats / appState.fatsTarget)) / 3 * 100;
    updateCircle('nutrition', avgPercent);
}

function updateWaterDisplay(today) {
    const percent = (today.water / appState.waterTarget) * 100;
    const displayPercent = Math.min(Math.round(percent), 100);
    
    setText('hydrationPercent', displayPercent + '%');
    setText('waterConsumed', Math.round(today.water));
    
    const bigCircle = document.getElementById('hydrationBigCircle');
    if (bigCircle) {
        const degrees = (displayPercent / 100) * 360;
        bigCircle.style.background = `conic-gradient(var(--accent) ${degrees}deg, var(--light) ${degrees}deg)`;
    }
    
    updateCircle('hydration', percent);
}

function updateActivityDisplay(today) {
    setText('stepsCount', today.steps);
    setText('exerciseTime', today.exercise.duration + ' min');
    
    const score = ((today.steps / 8000) * 50) + ((today.exercise.duration / 30) * 50);
    updateCircle('activity', score);
}

function updateSleepDisplay(today) {
    setText('lastSleep', today.sleep.hours + 'h');
    const percent = (today.sleep.hours / appState.sleepTarget) * 100;
    updateCircle('sleep', percent);
}

function updateMeditationDisplay(today) {
    setText('meditationTotal', today.meditation.total + ' min');
    const percent = (today.meditation.total / 10) * 100;
    updateCircle('meditation', percent);
}

function updateColonDisplay(today) {
    if (today.bowel.length > 0) {
        const last = today.bowel[today.bowel.length - 1];
        setText('lastBowel', last.time);
    }
    updateCircle('colon', today.bowel.length > 0 ? 50 : 0);
}

function updateGlobalScore(today) {
    const scores = calculateDailyScores(today);
    setText('globalScore', `Score global: ${scores.global}%`);
}

function updateCircle(section, percent) {
    const displayPercent = Math.min(Math.round(percent), 100);
    const circle = document.getElementById(section + 'Circle');
    if (circle) {
        const value = circle.querySelector('.progress-value');
        if (value) value.textContent = displayPercent + '%';
        const degrees = (displayPercent / 100) * 360;
        circle.style.background = `conic-gradient(var(--accent) ${degrees}deg, var(--light) ${degrees}deg)`;
    }
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setWidth(id, percent) {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.min(percent, 100) + '%';
}

function updateRecommendations(today) {
    const recs = [];
    
    if (today.water < appState.waterTarget * 0.7) {
        recs.push('💧 Buvez plus d\'eau');
    }
    
    const protein = today.foods.reduce((s, f) => s + f.protein, 0);
    if (protein < appState.proteinTarget * 0.7) {
        recs.push('🥩 Mangez plus de protéines');
    }
    
    if (today.steps < 5000) {
        recs.push('👣 Marchez plus');
    }
    
    if (today.meditation.total < 5) {
        recs.push('🧘 Méditez 5 minutes');
    }
    
    if (today.bowel.length === 0) {
        recs.push('🚽 Enregistrez votre selle');
    }
    
    const recDiv = document.getElementById('recommendations');
    if (recDiv) {
        if (recs.length > 0) {
            recDiv.innerHTML = '<h3>Recommandations</h3>' + 
                recs.map(r => `<div class="recommendation-item">${r}</div>`).join('');
        } else {
            recDiv.innerHTML = '<h3>🌟 Parfait ! Vous êtes à jour</h3>';
        }
    }
}

// ==================== SECTION SWITCHING ====================
function showSection(section) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const el = document.getElementById(section + 'Section');
    if (el) {
        el.style.display = 'block';
        if (section === 'calendrier') {
            showCalendar();
        }
    }
}

// ==================== CALENDRIER ====================
function showCalendar() {
    const year = appState.calendarDate.getFullYear();
    const month = appState.calendarDate.getMonth();
    
    document.getElementById('currentMonth').textContent = 
        appState.calendarDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let html = '';
    
    // Jours de la semaine
    const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    weekDays.forEach(day => {
        html += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Cases vides avant le premier jour
    for (let i = 1; i < (firstDay === 0 ? 6 : firstDay - 1); i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    // Jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
        const hasData = appState.daily[dateStr] && appState.daily[dateStr].foods.length > 0;
        const isToday = dateStr === appState.currentDay;
        
        html += `<div class="calendar-day ${hasData ? 'has-data' : ''} ${isToday ? 'today' : ''}" 
                      onclick="showDailyReport('${dateStr}')">
                    ${day}
                </div>`;
    }
    
    document.getElementById('calendar').innerHTML = html;
}

function changeMonth(delta) {
    appState.calendarDate.setMonth(appState.calendarDate.getMonth() + delta);
    showCalendar();
}

function showDailyReport(dateStr) {
    const dayData = appState.daily[dateStr];
    const reportDiv = document.getElementById('dailyReport');
    const statsDiv = document.getElementById('reportStats');
    
    if (!dayData) {
        reportDiv.innerHTML = '<h3>Aucune donnée pour ce jour</h3>';
        statsDiv.innerHTML = '';
        return;
    }
    
    const scores = dayData.scores || calculateDailyScores(dayData);
    const protein = dayData.foods.reduce((s, f) => s + f.protein, 0);
    
    reportDiv.innerHTML = `
        <h3>Rapport du ${new Date(dateStr).toLocaleDateString('fr-FR')}</h3>
        <div class="report-details">
            <p>💧 Eau: ${dayData.water}ml / ${appState.waterTarget}ml (${scores.water}%)</p>
            <p>🥩 Protéines: ${Math.round(protein)}g / ${appState.proteinTarget}g (${scores.protein}%)</p>
            <p>🏃 Pas: ${dayData.steps} | Exercice: ${dayData.exercise.duration}min (${scores.activity}%)</p>
            <p>😴 Sommeil: ${dayData.sleep.hours}h (${scores.sleep}%)</p>
            <p>🧘 Méditation: ${dayData.meditation.total}min (${scores.meditation}%)</p>
            <p>🚽 Selles: ${dayData.bowel.length} fois</p>
            <p><strong>⭐ Score global: ${scores.global}%</strong></p>
        </div>
    `;
    
    statsDiv.innerHTML = `
        <div class="report-stats">
            <div class="report-item">💧 ${scores.water}%</div>
            <div class="report-item">🥩 ${scores.protein}%</div>
            <div class="report-item">🏃 ${scores.activity}%</div>
            <div class="report-item">😴 ${scores.sleep}%</div>
            <div class="report-item">🧘 ${scores.meditation}%</div>
            <div class="report-item">⭐ ${scores.global}%</div>
        </div>
    `;
}

// ==================== FONCTIONS EAU ====================
function addWater(amount) {
    if (!amount || amount <= 0) return;
    const today = getTodayData();
    today.water += amount;
    today.waterHistory.push(amount);
    updateAllDisplays();
    saveState();
}

function undoLastWater() {
    const today = getTodayData();
    if (today.waterHistory.length > 0) {
        today.water -= today.waterHistory.pop();
        if (today.water < 0) today.water = 0;
        updateAllDisplays();
        saveState();
    }
}

function clearWater() {
    if (confirm('Réinitialiser l\'eau du jour ?')) {
        const today = getTodayData();
        today.water = 0;
        today.waterHistory = [];
        updateAllDisplays();
        saveState();
    }
}

// ==================== FONCTIONS ALIMENTS ====================
function loadFoodSelect() {
    const select = document.getElementById('foodSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Choisir...</option>';
    appState.foodDatabase.sort((a, b) => a.name.localeCompare(b.name)).forEach(food => {
        select.innerHTML += `<option value="${food.id}">${food.name}</option>`;
    });
}

function setQuantityType(type) {
    appState.quantityType = type;
    document.querySelectorAll('.qty-btn').forEach(btn => btn.classList.remove('active'));
    if (event) event.target.classList.add('active');
    
    document.getElementById('weightInput').style.display = type === 'weight' ? 'block' : 'none';
    document.getElementById('unitInput').style.display = type === 'unit' ? 'block' : 'none';
}

function addFood() {
    const foodId = parseInt(document.getElementById('foodSelect')?.value);
    if (!foodId) {
        alert('Choisissez un aliment');
        return;
    }
    
    const food = appState.foodDatabase.find(f => f.id === foodId);
    let quantity;
    
    if (appState.quantityType === 'weight') {
        quantity = parseFloat(document.getElementById('foodQuantity')?.value) || 100;
    } else {
        const units = parseFloat(document.getElementById('foodUnits')?.value) || 1;
        quantity = units * (food.unitWeight || 100);
    }
    
    const factor = quantity / 100;
    const consumed = {
        ...food,
        quantity: quantity,
        protein: (food.protein || 0) * factor,
        carbs: (food.carbs || 0) * factor,
        fats: (food.fats || 0) * factor,
        fiber: (food.fiber || 0) * factor
    };
    
    const today = getTodayData();
    today.foods.push(consumed);
    today.foodHistory.push(today.foods.length - 1);
    
    updateAllDisplays();
    updateTodayFoodsList();
    saveState();
}

function updateTodayFoodsList() {
    const list = document.getElementById('foodList');
    if (!list) return;
    
    const today = getTodayData();
    list.innerHTML = '';
    today.foods.forEach((food, i) => {
        list.innerHTML += `<li>
            ${food.name} (${food.quantity}g)
            <button onclick="removeFood(${i})" class="btn-small">✕</button>
        </li>`;
    });
}

function removeFood(index) {
    const today = getTodayData();
    today.foods.splice(index, 1);
    today.foodHistory = today.foodHistory.filter(i => i !== index);
    updateAllDisplays();
    updateTodayFoodsList();
    saveState();
}

function undoLastFood() {
    const today = getTodayData();
    if (today.foodHistory.length > 0) {
        today.foods.pop();
        today.foodHistory.pop();
        updateAllDisplays();
        updateTodayFoodsList();
        saveState();
    }
}

function clearAllFoods() {
    if (confirm('Supprimer tous les aliments ?')) {
        const today = getTodayData();
        today.foods = [];
        today.foodHistory = [];
        updateAllDisplays();
        updateTodayFoodsList();
        saveState();
    }
}

// ==================== FONCTIONS ACTIVITÉ ====================
function addSteps() {
    const steps = parseInt(document.getElementById('stepsInput')?.value);
    if (steps && steps > 0) {
        const today = getTodayData();
        today.steps += steps;
        updateAllDisplays();
        document.getElementById('stepsInput').value = '';
        saveState();
    }
}

function logExercise() {
    const duration = parseInt(document.getElementById('exerciseDuration')?.value);
    if (duration && duration > 0) {
        const today = getTodayData();
        today.exercise.duration += duration;
        today.exercise.sessions.push({ duration });
        updateAllDisplays();
        document.getElementById('exerciseDuration').value = '30';
        saveState();
    }
}

function undoLastExercise() {
    const today = getTodayData();
    if (today.exercise.sessions.length > 0) {
        const last = today.exercise.sessions.pop();
        today.exercise.duration -= last.duration;
        if (today.exercise.duration < 0) today.exercise.duration = 0;
        updateAllDisplays();
        saveState();
    }
}

// ==================== FONCTIONS SOMMEIL ====================
function logSleep() {
    const hours = parseFloat(document.getElementById('sleepHours')?.value);
    if (hours && hours > 0) {
        const today = getTodayData();
        today.sleep = {
            hours: hours,
            quality: document.getElementById('sleepQuality')?.value || 'good'
        };
        updateAllDisplays();
        saveState();
        addNotification('😴 Sommeil enregistré', `${hours} heures de sommeil`);
    }
}

function undoLastSleep() {
    const today = getTodayData();
    today.sleep = { hours: 0, quality: '' };
    updateAllDisplays();
    saveState();
}

// ==================== FONCTIONS CÔLON ====================
function updateBristolInfo() {
    const type = document.getElementById('bowelType')?.value;
    const info = document.getElementById('bristolInfo');
    const descriptions = {
        '1': 'Type 1 : Constipation sévère',
        '2': 'Type 2 : Constipation légère',
        '3': 'Type 3 : Normal',
        '4': 'Type 4 : Idéal',
        '5': 'Type 5 : Manque de fibres',
        '6': 'Type 6 : Diarrhée légère',
        '7': 'Type 7 : Diarrhée'
    };
    if (info) info.textContent = descriptions[type] || '';
}

function logBowel() {
    const time = document.getElementById('bowelTime')?.value || new Date().toLocaleTimeString();
    const type = document.getElementById('bowelType')?.value || '4';
    const symptoms = {
        pain: document.getElementById('symptomPain')?.checked || false,
        bloating: document.getElementById('symptomBloating')?.checked || false,
        gas: document.getElementById('symptomGas')?.checked || false
    };
    
    const today = getTodayData();
    today.bowel.push({ time, type: parseInt(type), symptoms });
    
    updateAllDisplays();
    saveState();
    addNotification('🚽 Selle enregistrée', `Type ${type} à ${time}`);
}

function undoLastBowel() {
    const today = getTodayData();
    if (today.bowel.length > 0) {
        today.bowel.pop();
        updateAllDisplays();
        saveState();
    }
}

// ==================== FONCTIONS MÉDITATION ====================
function setMeditationTime(minutes) {
    meditationSeconds = minutes * 60;
    updateMeditationTimer();
}

function updateMeditationTimer() {
    const mins = Math.floor(meditationSeconds / 60);
    const secs = meditationSeconds % 60;
    const timer = document.getElementById('meditationTimer');
    if (timer) {
        timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

function startMeditation() {
    if (meditationActive) return;
    
    meditationActive = true;
    meditationPaused = false;
    currentMeditationSession = { startTime: new Date() };
    
    document.getElementById('startMeditationBtn').style.display = 'none';
    document.getElementById('pauseMeditationBtn').style.display = 'inline-block';
    document.getElementById('stopMeditationBtn').style.display = 'inline-block';
    
    meditationTimer = setInterval(() => {
        if (!meditationPaused && meditationSeconds > 0) {
            meditationSeconds--;
            updateMeditationTimer();
        }
    }, 1000);
}

function pauseMeditation() {
    meditationPaused = !meditationPaused;
    const btn = document.getElementById('pauseMeditationBtn');
    if (btn) btn.textContent = meditationPaused ? 'Reprendre' : 'Pause';
}

function stopMeditation() {
    if (meditationTimer) {
        clearInterval(meditationTimer);
        meditationTimer = null;
    }
    meditationActive = false;
    
    document.getElementById('startMeditationBtn').style.display = 'inline-block';
    document.getElementById('pauseMeditationBtn').style.display = 'none';
    document.getElementById('stopMeditationBtn').style.display = 'none';
}

function logMeditation() {
    if (currentMeditationSession) {
        const minutes = Math.round((new Date() - currentMeditationSession.startTime) / 60000);
        if (minutes > 0) {
            const today = getTodayData();
            today.meditation.total += minutes;
            today.meditation.sessions.push({ minutes });
            updateAllDisplays();
            saveState();
            addNotification('🧘 Méditation', `${minutes} minutes de méditation`);
        }
    }
    stopMeditation();
    setMeditationTime(5);
}

function undoLastMeditation() {
    const today = getTodayData();
    if (today.meditation.sessions.length > 0) {
        const last = today.meditation.sessions.pop();
        today.meditation.total -= last.minutes;
        if (today.meditation.total < 0) today.meditation.total = 0;
        updateAllDisplays();
        saveState();
    }
}

// ==================== BASE DE DONNÉES ALIMENTS ====================
function addNewFood() {
    const name = document.getElementById('newFoodName')?.value;
    if (!name) {
        alert('Entrez un nom');
        return;
    }
    
    const newFood = {
        id: appState.nextFoodId++,
        name: name,
        protein: parseFloat(document.getElementById('newFoodProtein')?.value) || 0,
        carbs: parseFloat(document.getElementById('newFoodCarbs')?.value) || 0,
        fats: parseFloat(document.getElementById('newFoodFats')?.value) || 0,
        fiber: parseFloat(document.getElementById('newFoodFiber')?.value) || 0,
        unitWeight: parseFloat(document.getElementById('newFoodUnitWeight')?.value) || null
    };
    
    appState.foodDatabase.push(newFood);
    
    // Reset form
    ['newFoodName', 'newFoodProtein', 'newFoodCarbs', 'newFoodFats', 'newFoodFiber', 'newFoodUnitWeight']
        .forEach(id => document.getElementById(id).value = '');
    
    loadFoodSelect();
    updateFoodDatabaseList();
    saveState();
    alert('Aliment ajouté');
}

function updateFoodDatabaseList() {
    const list = document.getElementById('foodDatabaseList');
    if (!list) return;
    
    list.innerHTML = '';
    appState.foodDatabase.sort((a, b) => a.name.localeCompare(b.name)).forEach(food => {
        list.innerHTML += `<li>
            <strong>${food.name}</strong><br>
            <small>P:${food.protein}g G:${food.carbs}g L:${food.fats}g F:${food.fiber}g</small>
            ${food.unitWeight ? `<br><small>1 unité = ${food.unitWeight}g</small>` : ''}
        </li>`;
    });
}

// ==================== PROFIL ====================
function updateUserInfoDisplay() {
    const display = document.getElementById('userInfoDisplay');
    if (display) {
        display.innerHTML = `${appState.user.age} ans | ${appState.user.weight}kg | ${appState.user.height}cm`;
    }
    
    setText('profileAge', appState.user.age + ' ans');
    setText('profileWeight', appState.user.weight + ' kg');
    setText('profileHeight', appState.user.height + ' cm');
    setText('profileWakeUp', appState.user.wakeUpTime);
    setText('profileBedTime', appState.user.bedTime);
    
    if (appState.user.height && appState.user.weight) {
        const bmi = (appState.user.weight / ((appState.user.height / 100) ** 2)).toFixed(1);
        setText('profileBMI', bmi);
    }
}

function editProfile() {
    document.getElementById('editAge').value = appState.user.age;
    document.getElementById('editWeight').value = appState.user.weight;
    document.getElementById('editHeight').value = appState.user.height;
    document.getElementById('editGender').value = appState.user.gender;
    document.getElementById('editWakeUp').value = appState.user.wakeUpTime;
    document.getElementById('editBedTime').value = appState.user.bedTime;
    document.getElementById('editProfileModal').style.display = 'flex';
}

function saveProfileChanges() {
    appState.user.age = parseInt(document.getElementById('editAge').value);
    appState.user.weight = parseFloat(document.getElementById('editWeight').value);
    appState.user.height = parseFloat(document.getElementById('editHeight').value);
    appState.user.gender = document.getElementById('editGender').value;
    appState.user.wakeUpTime = document.getElementById('editWakeUp').value;
    appState.user.bedTime = document.getElementById('editBedTime').value;
    
    updateUserInfoDisplay();
    calculateNeeds();
    updateAllDisplays();
    saveState();
    closeEditModal();
    addNotification('✅ Profil mis à jour', 'Vos informations ont été sauvegardées');
}

function closeEditModal() {
    document.getElementById('editProfileModal').style.display = 'none';
}

// ==================== EXPORT ====================
function exportData() {
    const dataStr = JSON.stringify(appState, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sante-${appState.currentDay}.json`;
    a.click();
}

// ==================== RÉINITIALISATION ====================
function resetAllData() {
    if (confirm('⚠️ Réinitialiser TOUTES les données ? Cette action est irréversible.')) {
        localStorage.removeItem('healthAppState');
        location.reload();
    }
}

// ==================== CONFIRMATION ====================
function confirmAction() {
    // À implémenter si besoin
    closeConfirmModal();
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
}

// ==================== SAUVEGARDE ====================
function saveState() {
    localStorage.setItem('healthAppState', JSON.stringify(appState));
}

function loadSavedData() {
    const saved = localStorage.getItem('healthAppState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.user && parsed.user.age) {
                appState = parsed;
                appState.currentDay = new Date().toISOString().split('T')[0];
                
                if (!appState.daily[appState.currentDay]) {
                    appState.daily[appState.currentDay] = createEmptyDay();
                }
                
                document.getElementById('ageModal').style.display = 'none';
                document.getElementById('mainApp').style.display = 'block';
                
                updateUserInfoDisplay();
                calculateNeeds();
                updateAllDisplays();
                loadFoodSelect();
                updateFoodDatabaseList();
                updateTodayFoodsList();
            }
        } catch (e) {
            console.log('Erreur chargement');
        }
    }
}

// ==================== INITIALISATION ====================
window.onload = function() {
    loadSavedData();
    setMeditationTime(5);
    updateDateTime();
    
    // Événements
    document.getElementById('bowelNote')?.addEventListener('input', function() {
        document.getElementById('bowelNoteValue').textContent = this.value + '/10';
    });
};

// Sauvegarde automatique toutes les 30 secondes
setInterval(saveState, 30000);

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDf0wNsX5NIf-0m2aJmzGChCysNA9SkXM8",
    authDomain: "gold-ba350.firebaseapp.com",
    databaseURL: "https://gold-ba350-default-rtdb.firebaseio.com",
    projectId: "gold-ba350",
    storageBucket: "gold-ba350.firebasestorage.app",
    messagingSenderId: "59642977174",
    appId: "1:59642977174:web:07d9aefbd85889e77f9bb7"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe.user || { id: "Demo_User", first_name: "Player" };
const userId = user.id;
document.getElementById('tgName').innerText = user.first_name;

// ১. রেফারেল আইডি ধরার সঠিক নিয়ম (URL এবং Telegram Param দুইটাই চেক করবে)
const urlParams = new URLSearchParams(window.location.search);
let invitedBy = urlParams.get('start') || tg.initDataUnsafe.start_param;

let userData = { gold: 0, balance: 0, totalPerDay: 0, referCount: 0, referredBy: null, lastSyncTime: Date.now() };

const planes = [
    {cost:10, perDay:5},{cost:20, perDay:10},{cost:30, perDay:15},{cost:40, perDay:20},
    {cost:50, perDay:25},{cost:75, perDay:38},{cost:100, perDay:50},{cost:150, perDay:75},
    {cost:200, perDay:100},{cost:250, perDay:125},{cost:500, perDay:250},{cost:1000, perDay:500}
];

function showToast(m) {
    const t = document.getElementById("toast");
    t.innerText = m; t.className = "show";
    setTimeout(() => { t.className = ""; }, 3000);
}

const userRef = db.ref('users/' + userId);

// ২. মেইন ডাটা হ্যান্ডলার
userRef.on('value', (s) => {
    if (s.exists()) {
        userData = s.val();
        
        // অফলাইন ইনকাম ক্যালকুলেশন
        if (!window.initialSync) {
            let now = Date.now();
            let last = userData.lastSyncTime || now;
            let diff = (now - last) / 1000;
            if (userData.totalPerDay > 0 && userData.balance < 1000) {
                let earning = (userData.totalPerDay / 86400) * diff;
                userData.balance = Math.min(1000, (userData.balance || 0) + earning);
                userRef.update({ balance: userData.balance, lastSyncTime: now });
            }
            window.initialSync = true;
        }
        updateUI();
    } else {
        // নতুন ইউজার তৈরি এবং অটো রেফার বোনাস
        let newData = {
            name: user.first_name,
            gold: 500,
            balance: 0,
            totalPerDay: 0,
            referCount: 0, // নতুন ইউজারের রেফার সংখ্যা ০
            referredBy: (invitedBy && invitedBy != userId) ? invitedBy : null,
            lastSyncTime: Date.now()
        };
        
        userRef.set(newData).then(() => {
            // যদি কেউ রেফার করে থাকে, তাকে ২৫০ গোল্ড দেওয়া
            if (invitedBy && invitedBy != userId) {
                const refUserRef = db.ref('users/' + invitedBy);
                refUserRef.transaction((currentData) => {
                    if (currentData) {
                        currentData.gold = (currentData.gold || 0) + 250;
                        currentData.referCount = (currentData.referCount || 0) + 1; // ডাটাবেসে রেফার সংখ্যা বাড়বে
                    }
                    return currentData;
                });
            }
        });
    }
});

function updateUI() {
    document.getElementById('goldDisplay').innerText = Math.floor(userData.gold);
    document.getElementById('perHour').innerText = (userData.totalPerDay/24).toFixed(2);
    document.getElementById('perDayDisplay').innerText = userData.totalPerDay.toFixed(2);
    document.getElementById('perMonth').innerText = (userData.totalPerDay*30).toFixed(2);
}

// ৩. গোল্ড কালেকশন
function collectGold() {
    if (userData.balance < 1) return showToast("কমপক্ষে ১ গোল্ড লাগবে! ❌");
    let amt = Math.floor(userData.balance);
    userRef.update({
        gold: (userData.gold || 0) + amt,
        balance: (userData.balance || 0) - amt,
        lastSyncTime: Date.now()
    });
    showToast(amt + " গোল্ড কালেক্ট হয়েছে! ✅");
}

// ৪. মাইনিং এনিমেশন এবং ১০০০ লিমিট
let lastTime = Date.now();
function smoothMining() {
    let now = Date.now();
    let dt = (now - lastTime) / 1000;
    lastTime = now;

    if (userData.totalPerDay > 0) {
        let display = document.getElementById('balanceDisplay');
        if (userData.balance < 1000) {
            userData.balance += (userData.totalPerDay / 86400) * dt;
            if (userData.balance > 1000) userData.balance = 1000;
            display.style.animation = "none";
            display.style.color = "black";
        } else {
            display.style.animation = "rainbowText 1s linear infinite";
            display.style.fontWeight = "bold";
        }
        display.innerText = userData.balance.toFixed(5);
        if (Math.random() < 0.01) userRef.update({ balance: userData.balance, lastSyncTime: Date.now() });
    }
    requestAnimationFrame(smoothMining);
}
smoothMining();

// ৫. প্ল্যান কেনা এবং আজীবন ২০% কমিশন
function buy(i) {
    const p = planes[i];
    if (userData.gold < p.cost) return showToast("গোল্ড নেই! ❌");
    
    userRef.update({ 
        gold: userData.gold - p.cost, 
        totalPerDay: userData.totalPerDay + p.perDay, 
        lastSyncTime: Date.now() 
    });

    if (userData.referredBy) {
        const refUserRef = db.ref('users/' + userData.referredBy);
        refUserRef.transaction((currentData) => {
            if (currentData) {
                let commission = p.cost * 0.20;
                currentData.gold = (currentData.gold || 0) + commission;
            }
            return currentData;
        });
    }
    showToast("প্ল্যান সফল! ✅");
}

// ৬. রেফারেল এবং অন্যান্য
function openRefer() {
    let botUsername = "goldminerzonebot"; 
    document.getElementById('referLink').innerText = "https://t.me/" + botUsername + "?start=" + userId;
    
    // ইউজারের নিজের রেফার কাউন্ট দেখাবে
    let count = userData.referCount || 0;
    document.getElementById('referList').innerHTML = "Total Referrals: " + count;
    
    document.getElementById('referBox').style.display = "block";
}

function copyLink() { 
    let link = document.getElementById('referLink').innerText;
    navigator.clipboard.writeText(link); 
    showToast("লিঙ্ক কপি হয়েছে! ✅"); 
}

function submitWithdraw() {
    const amt = Number(document.getElementById('goldAmount').value);
    if(amt < 2000) return showToast("কমপক্ষে ২০০০ লাগবে! ❌");
    if(userData.gold < amt) return showToast("ব্যালেন্স নেই! ❌");
    db.ref('withdrawRequests').push({ 
        uid: userId, name: user.first_name, amt, 
        num: document.getElementById('payNumber').value, 
        method: document.getElementById('payMethod').value, 
        time: new Date().toLocaleString() 
    });
    userRef.update({ gold: userData.gold - amt });
    showToast("রিকোয়েস্ট সফল! ✅");
    closeWithdraw();
}

function closeRefer() { document.getElementById('referBox').style.display="none"; }
function openWithdraw() { document.getElementById('withdrawBox').style.display="block"; }
function closeWithdraw() { document.getElementById('withdrawBox').style.display="none"; }
function calcMoney() { document.getElementById('moneyShow').innerText = ((Number(document.getElementById('goldAmount').value) / 2000) * 100).toFixed(2); }

function renderPlans() {
    let h = '';
    planes.forEach((p, i) => {
        h += `<div class="plan">👷‍♂️<br>Cost: ${p.cost}<br>Day: ${p.perDay}<br><button onclick="buy(${i})">BUY</button></div>`;
    });
    document.getElementById('plansDisplay').innerHTML = h;
}
renderPlans();

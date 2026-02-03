// ===== SMARTLINK GATE SYSTEM (5s WINDOW) =====
const SMART_LINK = "https://spineporousposter.com/h2pbj6cp?key=e8c8edf89f1754bdf54a04e09366e59f";
const GATE_TIME = 5000;

function smartGate(realAction) {
  let now = Date.now();
  let gateStart = Number(localStorage.getItem("gateStartTime") || 0);

  if (gateStart && (now - gateStart <= GATE_TIME)) {
    localStorage.removeItem("gateStartTime");
    realAction();
    return;
  }

  localStorage.setItem("gateStartTime", now);
  window.open(SMART_LINK, "_blank");
  showToast("এড দেখে ৫ সেকেন্ডের মধ্যে আবার ক্লিক করুন ✅");
}

// ===== Firebase =====
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

// ===== Telegram =====
const tg = window.Telegram.WebApp;
const user = tg.initDataUnsafe.user || { id:"Demo", first_name:"Player" };
const userId = user.id;
tgName.innerText = user.first_name;

// ===== User Data =====
let userData = {
  gold: 0,
  balance: 0,
  totalPerDay: 0,
  lastActive: Date.now()
};

const planes = [
 {cost:10,perDay:5},{cost:20,perDay:10},{cost:30,perDay:15},{cost:40,perDay:20},
 {cost:50,perDay:25},{cost:75,perDay:38},{cost:100,perDay:50},{cost:150,perDay:75},
 {cost:200,perDay:100},{cost:250,perDay:125},{cost:500,perDay:250},{cost:1000,perDay:500}
];

// ===== UI =====
function showToast(m){
 toast.innerText = m;
 toast.className = "show";
 setTimeout(()=>toast.className="",3000);
}

const userRef = db.ref("users/"+userId);

// ===== LOAD USER =====
userRef.once("value").then(s=>{
 if(s.exists()){
  userData = s.val();
  applyOfflineEarning();
  updateUI();
 } else {
  userData = {
    name: user.first_name,
    gold: 500,
    balance: 0,
    totalPerDay: 0,
    lastActive: Date.now()
  };
  userRef.set(userData);
  updateUI();
 }
});

// ===== OFFLINE MINING (MAIN) =====
function applyOfflineEarning(){
 if(!userData.lastActive || !userData.totalPerDay) {
   userData.lastActive = Date.now();
   return;
 }

 let now = Date.now();
 let diffSec = (now - userData.lastActive) / 1000;

 if(diffSec > 10){
   let earned = (userData.totalPerDay / 86400) * diffSec;
   userData.balance += earned;

   showToast("অফলাইনে মাইন হয়েছে: +" + earned.toFixed(5));

   userData.lastActive = now;
   userRef.update({
     balance: userData.balance,
     lastActive: now
   });
 }
}

// ===== UI UPDATE =====
function updateUI(){
 goldDisplay.innerText = Math.floor(userData.gold || 0);
 perHour.innerText = ((userData.totalPerDay||0)/24).toFixed(2);
 perDayDisplay.innerText = (userData.totalPerDay||0).toFixed(2);
 perMonth.innerText = ((userData.totalPerDay||0)*30).toFixed(2);
 balanceDisplay.innerText = (userData.balance||0).toFixed(5);
}

// ===== LIVE MINING (ONLINE ONLY) =====
let lastTime = Date.now();
function smoothMining(){
 let now = Date.now();
 let dt = (now - lastTime) / 1000;
 lastTime = now;

 if(userData.totalPerDay){
  userData.balance += (userData.totalPerDay/86400) * dt;
  balanceDisplay.innerText = userData.balance.toFixed(5);
 }

 requestAnimationFrame(smoothMining);
}
smoothMining();

// ===== SAVE LAST ACTIVE WHEN EXIT / BACKGROUND =====
window.addEventListener("beforeunload", ()=>{
 userRef.update({ 
   lastActive: Date.now(), 
   balance: userData.balance 
 });
});

document.addEventListener("visibilitychange", ()=>{
 if(document.hidden){
   userRef.update({ 
     lastActive: Date.now(), 
     balance: userData.balance 
   });
 }
});

// ===== PLANS =====
function buy(i){
 const p = planes[i];
 if(userData.gold < p.cost) return showToast("গোল্ড নেই!");

 userData.gold -= p.cost;
 userData.totalPerDay += p.perDay;

 userRef.update({
  gold: userData.gold,
  totalPerDay: userData.totalPerDay
 });

 updateUI();
 showToast("প্ল্যান সফল!");
}

function renderPlans(){
 let h="";
 planes.forEach((p,i)=>{
  h+=`
  <div class="plan">
   👷‍♂️<br>
   Cost: ${p.cost}<br>
   Day: ${p.perDay}<br>
   <button onclick="smartGate(()=>buy(${i}))">BUY</button>
  </div>`;
 });
 plansDisplay.innerHTML = h;
}
renderPlans();

// ===== COLLECT =====
function collectGold(){
 if(userData.balance < 1) return showToast("কমপক্ষে ১ লাগবে!");
 let amt = Math.floor(userData.balance);

 userData.gold += amt;
 userData.balance -= amt;

 userRef.update({
  gold: userData.gold,
  balance: userData.balance
 });

 updateUI();
 showToast(amt + " গোল্ড কালেক্ট!");
}

// ===== WITHDRAW =====
function submitWithdraw(){
 const amt = Number(goldAmount.value);
 if(amt < 2000) return showToast("কমপক্ষে ২০০০ লাগবে!");
 if(userData.gold < amt) return showToast("ব্যালেন্স নেই!");

 db.ref("withdrawRequests").push({
  uid: userId,
  amt,
  num: payNumber.value,
  method: payMethod.value,
  time: Date.now()
 });

 userData.gold -= amt;
 userRef.update({ gold: userData.gold });

 updateUI();
 showToast("রিকোয়েস্ট সফল!");
 closeWithdraw();
}

// ===== OTHERS =====
function calcMoney(){
 moneyShow.innerText = ((Number(goldAmount.value)/2000)*100).toFixed(2);
}

function openWithdraw(){ withdrawBox.style.display="block"; }
function closeWithdraw(){ withdrawBox.style.display="none"; }

function openRefer(){
 referLink.innerText = "https://t.me/goldminerzonebot?start=" + userId;
 referBox.style.display="block";
}
function closeRefer(){ referBox.style.display="none"; }

function copyLink(){
 navigator.clipboard.writeText(referLink.innerText);
 showToast("লিঙ্ক কপি!");
}

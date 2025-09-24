// Keys
const KEY = {ACCS:'accs_v1', TRANS:'trans_v1', CUST:'cust_v1', ASSETS:'assets_v1', ITEMS:'items_v1', CASH:'cash_v1', USERS:'users_v1', ORG:'org_v1'};

document.addEventListener('DOMContentLoaded', init);

function init(){
  ensureDefault();
  setupUI();
  renderAll();
}

// ensure default data
function ensureDefault(){
  if(!localStorage.getItem(KEY.USERS)) localStorage.setItem(KEY.USERS, JSON.stringify([{username:'admin',password:'1234',role:'admin'}]));
  if(!localStorage.getItem(KEY.ACCS)){
    const seed = [
      {code:'1000',name:'أصول ثابتة',type:'Asset',parent:''},
      {code:'1010',name:'أرض',type:'Asset',parent:'1000'},
      {code:'1020',name:'مباني',type:'Asset',parent:'1000'},
      {code:'1100',name:'أصول متداولة',type:'Asset',parent:''},
      {code:'1110',name:'نقدية بالصندوق',type:'Asset',parent:'1100'},
      {code:'1120',name:'حسابات بنكية',type:'Asset',parent:'1100'},
      {code:'1130',name:'مدينون',type:'Asset',parent:'1100'},
      {code:'1140',name:'مخزون',type:'Asset',parent:'1100'},
      {code:'2000',name:'دائنون',type:'Liability',parent:''},
      {code:'3000',name:'رأس المال',type:'Equity',parent:''},
      {code:'4110',name:'إيرادات النشاط',type:'Revenue',parent:''},
      {code:'5110',name:'رواتب',type:'Expense',parent:''},
      {code:'5200',name:'مصاريف تشغيلية',type:'Expense',parent:''},
      {code:'6000',name:'أرباح/خسائر',type:'Closing',parent:''}
    ];
    localStorage.setItem(KEY.ACCS, JSON.stringify(seed));
  }
  if(!localStorage.getItem(KEY.TRANS)) localStorage.setItem(KEY.TRANS, JSON.stringify([]));
  if(!localStorage.getItem(KEY.CUST)) localStorage.setItem(KEY.CUST, JSON.stringify([]));
  if(!localStorage.getItem(KEY.ASSETS)) localStorage.setItem(KEY.ASSETS, JSON.stringify([]));
  if(!localStorage.getItem(KEY.ITEMS)) localStorage.setItem(KEY.ITEMS, JSON.stringify([]));
  if(!localStorage.getItem(KEY.CASH)) localStorage.setItem(KEY.CASH, JSON.stringify({balance:0}));
  if(!localStorage.getItem(KEY.ORG)) localStorage.setItem(KEY.ORG, JSON.stringify({name:'مؤسستي', currency:'YER'}));
}

// UI setup
function setupUI(){
  // pages and views
  window.pages = document.querySelectorAll('.page');
  window.views = document.querySelectorAll('.view');

  // login
  document.getElementById('loginForm').addEventListener('submit', function(e){
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const users = JSON.parse(localStorage.getItem(KEY.USERS)||'[]');
    const found = users.find(x=>x.username===u && x.password===p);
    if(found){ document.getElementById('current-user').innerText = `المستخدم: ${found.username}`; showApp(); }
    else alert('خطأ في اسم المستخدم أو كلمة المرور');
  });
  document.getElementById('demo-btn').addEventListener('click', function(){
    document.getElementById('login-username').value='admin'; document.getElementById('login-password').value='1234';
  });

  document.getElementById('logout-btn').addEventListener('click', function(){ if(confirm('تسجيل الخروج؟')) showLogin(); });

  // account events
  document.getElementById('acc-add').addEventListener('click', accAddHandler);
  document.getElementById('acc-clear').addEventListener('click', ()=>{ document.getElementById('accountForm').reset(); editAcc=null; });
  document.getElementById('acc-search').addEventListener('input', accSearch);
  document.getElementById('acc-export').addEventListener('click', exportAccountsCSV);
  document.getElementById('acc-import-btn').addEventListener('click', ()=>document.getElementById('acc-import-file').click());
  document.getElementById('acc-import-file').addEventListener('change', importAccountsCSV);

  // transactions
  document.getElementById('trans-search').addEventListener('input', transSearch);
  document.getElementById('t-save').addEventListener('click', saveTransaction);
  document.getElementById('trans-export').addEventListener('click', exportTransactionsExcel);
  document.getElementById('trans-print').addEventListener('click', printTransactions);

  // customers
  document.getElementById('cust-search').addEventListener('input', custSearch);
  document.getElementById('c-save').addEventListener('click', saveCustomer);

  // assets
  document.getElementById('asset-search').addEventListener('input', assetSearch);
  document.getElementById('a-save').addEventListener('click', saveAsset);

  // items
  document.getElementById('item-search').addEventListener('input', itemSearch);
  document.getElementById('i-save').addEventListener('click', saveItem);

  // cash
  document.getElementById('cash-save').addEventListener('click', saveCashAdjust);

  // reports
  document.getElementById('show-trial-balance').addEventListener('click', generateTrialBalance);
  document.getElementById('show-income-statement').addEventListener('click', generateIncomeStatement);
  document.getElementById('show-balance-sheet').addEventListener('click', generateBalanceSheet);

  // settings
  document.getElementById('save-org').addEventListener('click', saveOrg);
  document.getElementById('reset-data').addEventListener('click', resetAllData);
}

// navigation
function showLogin(){ pages.forEach(p=>p.classList.remove('active')); document.getElementById('login-page').classList.add('active'); }
function showApp(){ pages.forEach(p=>p.classList.remove('active')); document.getElementById('app').classList.add('active'); showView('dashboard'); renderAll(); }
function showView(id){
  views.forEach(v=>v.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if(id==='accounts') renderAccountsTree();
  if(id==='transactions') renderTransactionsTable();
  if(id==='receivables') renderCustomers();
  if(id==='assets') renderAssets();
  if(id==='inventory') renderItems();
  if(id==='cash') renderCash();
  if(id==='reports') document.getElementById('reportsContent').innerHTML = ''; // clear reports
}

// ---------- ACCOUNTS ----------
let editAcc = null;
function loadAccounts(){ return JSON.parse(localStorage.getItem(KEY.ACCS)||'[]'); }
function saveAccounts(arr){ localStorage.setItem(KEY.ACCS, JSON.stringify(arr)); renderAccountsTree(); populateAccountSelects(); }

function renderAccountsTree(){
  const container = document.getElementById('accountsList');
  const arr = loadAccounts();
  const map = {}; arr.forEach(a=> map[a.code]=Object.assign({},a,{children:[]}));
  const roots = [];
  arr.forEach(a=>{
    if(a.parent && map[a.parent]) map[a.parent].children.push(map[a.code]);
    else roots.push(map[a.code]);
  });
  container.innerHTML='';
  function renderNode(node,depth=0){
    const el = document.createElement('div'); el.className='tree-node';
    el.style.paddingRight = (depth*12)+'px';
    el.innerHTML = `<strong>${node.code}</strong> — ${node.name} <span class="small-text">(${node.type})</span>
      <span style="float:left">
        <button class="btn small" onclick="accEdit('${node.code}')">تعديل</button>
        <button class="btn small danger" onclick="accDelete('${node.code}')">حذف</button>
      </span>`;
    container.appendChild(el);
    if(node.children && node.children.length){
      node.children.sort((a,b)=>a.code.localeCompare(b.code)).forEach(c=>renderNode(c, depth+1));
    }
  }
  roots.sort((a,b)=>a.code.localeCompare(b.code)).forEach(r=>renderNode(r,0));
}

function accAddHandler(e){
  e.preventDefault();
  const code = document.getElementById('acc-code').value.trim();
  const name = document.getElementById('acc-name').value.trim();
  const type = document.getElementById('acc-type').value;
  const parent = document.getElementById('acc-parent').value.trim();
  if(!code||!name){ alert('ادخل الكود والاسم'); return; }
  const arr = loadAccounts();
  if(editAcc){
    const idx = arr.findIndex(x=>x.code===editAcc);
    if(idx>-1){
      if(code!==editAcc && arr.find(x=>x.code===code)){ alert('الكود موجود'); return; }
      arr[idx]={code,name,type,parent};
      editAcc=null;
    }
  } else {
    if(arr.find(x=>x.code===code)){ alert('هذا الكود موجود'); return; }
    arr.push({code,name,type,parent});
  }
  saveAccounts(arr);
  document.getElementById('accountForm').reset();
}

function accEdit(code){
  const arr = loadAccounts(); const a = arr.find(x=>x.code===code);
  if(!a) return;
  editAcc = a.code;
  document.getElementById('acc-code').value = a.code;
  document.getElementById('acc-name').value = a.name;
  document.getElementById('acc-type').value = a.type;
  document.getElementById('acc-parent').value = a.parent || '';
  showView('accounts');
}

function accDelete(code){
  if(!confirm('تأكيد حذف الحساب؟')) return;
  const trans = JSON.parse(localStorage.getItem(KEY.TRANS)||'[]');
  const used = trans.some(t=> t.debitCode===code || t.creditCode===code);
  if(used){ alert('الحساب مستخدم في معاملات، لا يمكن حذفه'); return; }
  const arr = loadAccounts().filter(x=>x.code!==code);
  saveAccounts(arr);
}

function accSearch(){ const q=this.value.trim().toLowerCase(); const nodes=document.querySelectorAll('#accountsList .tree-node'); nodes.forEach(n=> n.style.display = (!q || n.innerText.toLowerCase().includes(q)) ? 'block' : 'none'); }

function exportAccountsCSV(){
  const arr = loadAccounts();
  let csv = 'code,name,type,parent\n' + arr.map(a=>`${a.code},"${a.name}",${a.type},${a.parent||''}`).join('\n');
  const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='accounts.csv'; a.click();
}
function importAccountsCSV(e){
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader(); reader.onload = ()=> {
    const lines = reader.result.split(/\r?\n/).slice(1).filter(Boolean);
    const arr = loadAccounts();
    lines.forEach(l=>{
      const cols = l.split(',');
      const code = cols[0].trim();
      const name = (cols[1]||'').replace(/^"|"$/g,'').trim();
      const type = cols[2] ? cols[2].trim() : 'Asset';
      const parent = cols[3] ? cols[3].trim() : '';
      if(code && name && !arr.find(x=>x.code===code)) arr.push({code,name,type,parent});
    });
    saveAccounts(arr); alert('تم الاستيراد');
  };
  reader.readAsText(f,'utf-8');
}

// populate selects used in forms
function populateAccountSelects(){
  const arr = loadAccounts().sort((a,b)=>a.code.localeCompare(b.code));
  const debit = document.getElementById('t-debit'); const credit = document.getElementById('t-credit');
  if(!debit || !credit) return;
  debit.innerHTML = '<option value="">-- اختر حساب --</option>'; credit.innerHTML = '<option value="">-- اختر حساب --</option>';
  arr.forEach(a=>{
    const txt = `${a.code} — ${a.name}`;
    const o1 = document.createElement('option'); o1.value = a.code; o1.textContent = txt;
    const o2 = o1.cloneNode(true);
    debit.appendChild(o1); credit.appendChild(o2);
  });
}

// ---------- TRANSACTIONS ----------
let editTransIndex = -1;
function loadTrans(){ return JSON.parse(localStorage.getItem(KEY.TRANS)||'[]'); }
function saveTrans(arr){ localStorage.setItem(KEY.TRANS, JSON.stringify(arr)); renderTransactionsTable(); updateDashboard(); }

function openTransForm(edit=false, index=null){
  document.getElementById('transModal').classList.add('show');
  document.getElementById('transTitle').innerText = edit ? 'تعديل قيد' : 'إضافة قيد';
  if(edit){
    editTransIndex = index;
    const t = loadTrans()[index];
    if(!t) return;
    document.getElementById('t-entry').value = t.entry;
    document.getElementById('t-date').value = t.date;
    document.getElementById('t-desc').value = t.desc;
    document.getElementById('t-doc').value = t.doc;
    document.getElementById('t-debit').value = t.debitCode;
    document.getElementById('t-credit').value = t.creditCode;
    document.getElementById('t-amount').value = t.amount;
    document.getElementById('t-project').value = t.project;
    document.getElementById('t-type').value = t.type;
    document.getElementById('t-notes').value = t.notes;
  } else {
    editTransIndex = -1;
    document.getElementById('transForm').reset();
    document.getElementById('t-entry').value = loadTrans().length + 1;
    document.getElementById('t-date').value = new Date().toISOString().slice(0,10);
  }
}
function closeTransForm(){ document.getElementById('transModal').classList.remove('show'); }
function saveTransaction(){
  const entry = document.getElementById('t-entry').value;
  const date = document.getElementById('t-date').value;
  const desc = document.getElementById('t-desc').value.trim();
  const doc = document.getElementById('t-doc').value.trim();
  const debitCode = document.getElementById('t-debit').value;
  const creditCode = document.getElementById('t-credit').value;
  const amount = parseFloat(document.getElementById('t-amount').value) || 0;
  const project = document.getElementById('t-project').value.trim();
  const type = document.getElementById('t-type').value;
  const notes = document.getElementById('t-notes').value.trim();
  if(!date || !desc || !debitCode || !creditCode || amount <= 0){ alert('ادخل جميع الحقول الرئيسية'); return; }
  const arr = loadTrans();
  const tx = {entry, date, desc, doc, debitCode, creditCode, amount, project, type, notes};
  if(editTransIndex > -1) arr[editTransIndex] = tx;
  else arr.push(tx);
  saveTrans(arr); closeTransForm();
}

function renderTransactionsTable(){
  const arr = loadTrans(); const tbody = document.querySelector('#transTable tbody'); tbody.innerHTML='';
  arr.forEach((t,i)=>{
    const debitAcc = loadAccounts().find(a=>a.code===t.debitCode);
    const creditAcc = loadAccounts().find(a=>a.code===t.creditCode);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${t.entry}</td><td>${t.date}</td><td>${t.desc}</td><td>${t.doc}</td><td>${debitAcc ? debitAcc.name : ''}</td><td>${creditAcc ? creditAcc.name : ''}</td><td>${t.amount}</td><td>${t.project}</td><td>${t.type}</td><td>${t.notes}</td>
      <td><button class="btn small" onclick="openTransForm(true,${i})">تعديل</button> <button class="btn small danger" onclick="deleteTrans(${i})">حذف</button></td>`;
    tbody.appendChild(tr);
  });
}
function deleteTrans(i){
  if(!confirm('تأكيد حذف القيد؟')) return;
  const arr = loadTrans(); arr.splice(i,1); saveTrans(arr);
}
function transSearch(){ const q=this.value.trim().toLowerCase(); document.querySelectorAll('#transTable tbody tr').forEach(r=> r.style.display = (!q || r.innerText.toLowerCase().includes(q)) ? '' : 'none'); }

// ---------- CUSTOMERS ----------
let editCustIndex = -1;
function loadCustomers(){ return JSON.parse(localStorage.getItem(KEY.CUST)||'[]'); }
function saveCustomers(arr){ localStorage.setItem(KEY.CUST, JSON.stringify(arr)); renderCustomers(); }

function openCustomerForm(edit=false,index=null){
  document.getElementById('custModal').classList.add('show');
  if(edit){ editCustIndex=index; const c=loadCustomers()[index]; document.getElementById('c-name').value=c.name; document.getElementById('c-type').value=c.type; document.getElementById('c-phone').value=c.phone; }
  else { editCustIndex=-1; document.getElementById('custForm').reset(); }
}
function closeCustForm(){ document.getElementById('custModal').classList.remove('show'); }
function saveCustomer(){
  const name = document.getElementById('c-name').value.trim();
  const type = document.getElementById('c-type').value;
  const phone = document.getElementById('c-phone').value.trim();
  if(!name){ alert('ادخل الاسم'); return; }
  const arr = loadCustomers();
  if(editCustIndex>-1){ arr[editCustIndex] = {name,type,phone}; editCustIndex=-1; }
  else arr.push({name,type,phone});
  saveCustomers(arr); closeCustForm();
}

function renderCustomers(){
  const arr = loadCustomers(); const tbody = document.querySelector('#custTable tbody'); tbody.innerHTML='';
  arr.forEach((c,i)=>{
    const balance = calcCustomerBalance(c.name);
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${c.name}</td><td>${c.type}</td><td>${balance}</td>
      <td><button class="btn small" onclick="openCustomerForm(true,${i})">تعديل</button></td>`;
    tbody.appendChild(tr);
  });
}
function calcCustomerBalance(name){
  const trans = loadTrans();
  let bal = 0;
  trans.forEach(t=>{
    if(t.desc.includes(name) || t.project===name){
      if(t.debitCode==='1130') bal += Number(t.amount);
      if(t.creditCode==='1130') bal -= Number(t.amount);
      if(t.creditCode==='2000') bal -= Number(t.amount);
      if(t.debitCode==='2000') bal += Number(t.amount);
    }
  });
  return bal;
}
function custSearch(){ const q=this.value.trim().toLowerCase(); document.querySelectorAll('#custTable tbody tr').forEach(r=> r.style.display = (!q || r.innerText.toLowerCase().includes(q)) ? '' : 'none'); }

// ---------- ASSETS ----------
let editAssetIndex = -1;
function loadAssets(){ return JSON.parse(localStorage.getItem(KEY.ASSETS)||'[]'); }
function saveAssets(arr){ localStorage.setItem(KEY.ASSETS, JSON.stringify(arr)); renderAssets(); }

function openAssetForm(edit=false,index=null){
  document.getElementById('assetModal').classList.add('show');
  if(edit){ editAssetIndex=index; const a=loadAssets()[index]; document.getElementById('a-code').value=a.code; document.getElementById('a-name').value=a.name; document.getElementById('a-cost').value=a.cost; document.getElementById('a-date').value=a.date; document.getElementById('a-life').value=a.life; }
  else { editAssetIndex=-1; document.getElementById('assetForm').reset(); }
}
function closeAssetForm(){ document.getElementById('assetModal').classList.remove('show'); }
function saveAsset(){
  const code=document.getElementById('a-code').value.trim(); const name=document.getElementById('a-name').value.trim();
  const cost=parseFloat(document.getElementById('a-cost').value)||0; const date=document.getElementById('a-date').value || ''; const life=parseInt(document.getElementById('a-life').value)||0;
  if(!code||!name){ alert('ادخل كود واسم'); return; }
  const arr=loadAssets();
  if(editAssetIndex>-1){ arr[editAssetIndex]={code,name,cost,date,life}; editAssetIndex=-1; } else arr.push({code,name,cost,date,life});
  saveAssets(arr); closeAssetForm();
}
function renderAssets(){
  const arr=loadAssets(); const tbody=document.querySelector('#assetTable tbody'); tbody.innerHTML='';
  arr.forEach((a,i)=>{
    const accum = calcAccumulatedDep(a); const book = (a.cost - accum).toFixed(2);
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${a.code}</td><td>${a.name}</td><td>${a.cost}</td><td>${a.date||''}</td><td>${a.life||''}</td><td>${book}</td>
      <td><button class="btn small" onclick="openAssetForm(true,${i})">تعديل</button></td>`;
    tbody.appendChild(tr);
  });
}
function calcAccumulatedDep(a){
  if(!a.life || a.life<=0) return 0;
  const years = Math.max(0, new Date().getFullYear() - (a.date?new Date(a.date).getFullYear():new Date().getFullYear()));
  const annual = a.cost / a.life;
  return Math.min(a.cost, annual * years);
}
function assetSearch(){ const q=this.value.trim().toLowerCase(); document.querySelectorAll('#assetTable tbody tr').forEach(r=> r.style.display = (!q || r.innerText.toLowerCase().includes(q)) ? '' : 'none'); }

// ---------- ITEMS (Inventory) ----------
let editItemIndex = -1;
function loadItems(){ return JSON.parse(localStorage.getItem(KEY.ITEMS)||'[]'); }
function saveItems(arr){ localStorage.setItem(KEY.ITEMS, JSON.stringify(arr)); renderItems(); updateDashboard(); }

function openItemForm(edit=false,index=null){
  document.getElementById('itemModal').classList.add('show');
  if(edit){ editItemIndex=index; const it=loadItems()[index]; document.getElementById('i-code').value=it.code; document.getElementById('i-name').value=it.name; document.getElementById('i-qty').value=it.qty; document.getElementById('i-cost').value=it.cost; }
  else { editItemIndex=-1; document.getElementById('itemForm').reset(); }
}
function closeItemForm(){ document.getElementById('itemModal').classList.remove('show'); }
function saveItem(){
  const code=document.getElementById('i-code').value.trim(); const name=document.getElementById('i-name').value.trim();
  const qty = parseFloat(document.getElementById('i-qty').value)||0; const cost=parseFloat(document.getElementById('i-cost').value)||0;
  if(!code||!name){ alert('ادخل كود واسم'); return; }
  const arr=loadItems();
  if(editItemIndex>-1){ arr[editItemIndex]={code,name,qty,cost}; editItemIndex=-1; } else arr.push({code,name,qty,cost});
  saveItems(arr); closeItemForm();
}
function renderItems(){
  const arr=loadItems(); const tbody=document.querySelector('#itemTable tbody'); tbody.innerHTML='';
  arr.forEach((it,i)=>{
    const value = (it.qty * it.cost).toFixed(2);
    const tr=document.createElement('tr');
    tr.innerHTML = `<td>${it.code}</td><td>${it.name}</td><td>${it.qty}</td><td>${it.cost}</td><td>${value}</td>
      <td><button class="btn small" onclick="openItemForm(true,${i})">تعديل</button></td>`;
    tbody.appendChild(tr);
  });
}
function itemSearch(){ const q=this.value.trim().toLowerCase(); document.querySelectorAll('#itemTable tbody tr').forEach(r=> r.style.display = (!q || r.innerText.toLowerCase().includes(q)) ? '' : 'none'); }

// ---------- CASH ----------
function renderCash(){
  const c = JSON.parse(localStorage.getItem(KEY.CASH)||'{"balance":0}');
  document.getElementById('cash-balance').innerText = Number(c.balance).toFixed(2);
  document.getElementById('dash-cash').innerText = Number(c.balance).toFixed(2);
}
function openCashAdjust(type){
  document.getElementById('cashModal').classList.add('show');
  document.getElementById('cash-type').value = type;
  document.getElementById('cashForm').reset();
  document.getElementById('cashTitle').innerText = type==='in' ? 'إيداع نقد' : 'سحب نقد';
}
function closeCashForm(){ document.getElementById('cashModal').classList.remove('show'); }
function saveCashAdjust(){
  const type=document.getElementById('cash-type').value; const amount = parseFloat(document.getElementById('cash-amount').value)||0; const desc=document.getElementById('cash-desc').value.trim();
  if(!amount || amount<=0){ alert('ادخل مبلغ صحيح'); return; }
  const cash = JSON.parse(localStorage.getItem(KEY.CASH)||'{"balance":0}');
  if(type==='in') cash.balance = Number(cash.balance) + Number(amount);
  else cash.balance = Number(cash.balance) - Number(amount);
  localStorage.setItem(KEY.CASH, JSON.stringify(cash));
  // also create transaction: if cash in -> debit cash(1110) credit appropriate (use 4110 income as default)
  const defaultOpp = type==='in' ? '4110' : '5110';
  const tx = {entry: loadTrans().length+1, date: new Date().toISOString().slice(0,10), desc: desc|| (type==='in'?'ايداع نقد':'سحب نقد'), doc:'', debitCode: type==='in'?'1110':defaultOpp, creditCode: type==='in'?defaultOpp:'1110', amount, project:'', type:'بنكية', notes:'تعديل صندوق'};
  const arr=loadTrans(); arr.unshift(tx); saveTrans(arr);
  renderCash(); closeCashForm();
}

// ---------- REPORTS ----------
function updateDashboard(){
  const trans = loadTrans();
  let rev=0, exp=0;
  trans.forEach(t=>{
    if(t.type==='إيرادات') rev += Number(t.amount);
    else if(t.type==='مصروفات') exp += Number(t.amount);
  });
  document.getElementById('dash-rev').innerText = rev.toFixed(2);
  document.getElementById('dash-exp').innerText = exp.toFixed(2);
  document.getElementById('dash-inv').innerText = loadItems().length;
}

function getAllBalances(){
  const accs = loadAccounts(); const trans = loadTrans();
  const balances = {};
  accs.forEach(a=> balances[a.code]=0);
  trans.forEach(t=>{
    if(balances[t.debitCode]===undefined) balances[t.debitCode]=0;
    if(balances[t.creditCode]===undefined) balances[t.creditCode]=0;
    balances[t.debitCode] += Number(t.amount);
    balances[t.creditCode] -= Number(t.amount);
  });
  return balances;
}

function getProfit(){
  const trans = loadTrans();
  let revenue = 0, expense = 0;
  trans.forEach(t => {
    const debitAcc = loadAccounts().find(a => a.code === t.debitCode);
    const creditAcc = loadAccounts().find(a => a.code === t.creditCode);
    if(creditAcc && creditAcc.type === 'Revenue') revenue += Number(t.amount);
    if(debitAcc && debitAcc.type === 'Expense') expense += Number(t.amount);
  });
  return revenue - expense;
}

function generateTrialBalance(){
  const accs = loadAccounts(); const balances = getAllBalances();
  let html = '<h3>ميزان المراجعة</h3><table class="table"><thead><tr><th>كود</th><th>حساب</th><th>رصيد</th></tr></thead><tbody>';
  for(const code in balances){
    const acc = accs.find(a=>a.code===code);
    html += `<tr><td>${code}</td><td>${acc?acc.name: ''}</td><td>${balances[code].toFixed(2)}</td></tr>`;
  }
  html += '</tbody></table>';
  document.getElementById('reportsContent').innerHTML = html;
}

function generateIncomeStatement(){
  const trans = loadTrans();
  let revenue = 0, expense = 0;
  trans.forEach(t => {
    const debitAcc = loadAccounts().find(a => a.code === t.debitCode);
    const creditAcc = loadAccounts().find(a => a.code === t.creditCode);
    if(creditAcc && creditAcc.type === 'Revenue') revenue += Number(t.amount);
    if(debitAcc && debitAcc.type === 'Expense') expense += Number(t.amount);
  });
  const profit = revenue - expense;
  let html = '<h3>قائمة الدخل</h3><p>الإيرادات: ' + revenue.toFixed(2) + '</p><p>المصروفات: ' + expense.toFixed(2) + '</p><p>الربح/الخسارة: ' + profit.toFixed(2) + '</p>';
  document.getElementById('reportsContent').innerHTML = html;
}

function generateBalanceSheet(){
  const balances = getAllBalances();
  const accs = loadAccounts();
  let assets = 0, liabilities = 0, equity = 0;
  for(const code in balances){
    const acc = accs.find(a => a.code === code);
    if(acc.type === 'Asset') assets += balances[code];
    if(acc.type === 'Liability') liabilities += Math.abs(balances[code]);
    if(acc.type === 'Equity') equity += Math.abs(balances[code]);
  }
  equity += getProfit();
  let html = '<h3>الميزانية</h3><p>الأصول: ' + assets.toFixed(2) + '</p><p>الخصوم: ' + liabilities.toFixed(2) + '</p><p>حقوق الملكية: ' + equity.toFixed(2) + '</p>';
  document.getElementById('reportsContent').innerHTML = html;
}

// ---------- EXPORT / PRINT ----------
function exportTransactionsExcel(){
  const table = document.getElementById('transTable');
  const html = table.outerHTML.replace(/ /g, '%20');
  const a = document.createElement('a'); a.href = 'data:application/vnd.ms-excel,' + html; a.download = 'transactions.xls'; a.click();
}
function printTransactions(){
  const w = window.open('','print','height=700,width=1000');
  w.document.write('<html><head><title>المعاملات</title></head><body>');
  w.document.write(document.getElementById('transTable').outerHTML);
  w.document.write('</body></html>');
  w.document.close(); w.print();
}

// ---------- SETTINGS ----------
function saveOrg(){ const name=document.getElementById('org-name').value.trim(); const cur=document.getElementById('org-currency').value.trim(); localStorage.setItem(KEY.ORG, JSON.stringify({name, currency:cur})); alert('تم الحفظ'); }
function resetAllData(){ if(!confirm('سيتم مسح كل البيانات المحلية. تأكيد؟')) return; Object.values(KEY).forEach(k=>localStorage.removeItem(k)); ensureDefault(); renderAll(); alert('تم إعادة التهيئة'); }

// ---------- RENDER ALL ----------
function renderAll(){
  renderAccountsTree(); populateAccountSelects(); renderTransactionsTable(); renderCustomers(); renderAssets(); renderItems(); renderCash(); updateDashboard();
}

// Helpers to expose openers to onclick in HTML
window.openTransForm = (edit, i)=> openTransForm(edit, i);
window.openCustomerForm = (edit, i)=> openCustomerForm(edit, i);
window.openAssetForm = (edit, i)=> openAssetForm(edit, i);
window.openItemForm = (edit, i)=> openItemForm(edit, i);
window.openCashAdjust = (t)=> openCashAdjust(t);
window.accEdit = (code)=> accEdit(code);
window.accDelete = (code)=> accDelete(code);
window.deleteTrans = (i)=> deleteTrans(i);

// initial view
function showInitial(){ showLogin(); }
showInitial();
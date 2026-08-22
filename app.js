(() => {
  const STORAGE_KEY = "rph-sains-t4-2026-v1";
  const fields = [
    ["hari","Hari","third"],["tarikh","Tarikh","third"],["kelas","Kelas","third"],["masa","Masa","third"],
    ["mataPelajaran","Mata Pelajaran","half"],["tema","Tema","half"],
    ["topik","Topik","half"],["standardKandungan","Standard Kandungan","half"],
    ["standardPembelajaran","Standard Pembelajaran","field-full"],
    ["objektif","Objektif Pembelajaran","field-full"],
    ["kriteria","Kriteria Kejayaan","field-full"],
    ["aktiviti","Aktiviti PdP","activity"],
    ["pentaksiran","Pentaksiran","half"],["bbb","Bahan Bantu Belajar","half"],
    ["refleksi","Refleksi","field-full"]
  ];

  let week = Number(localStorage.getItem("rph-current-week") || 1);
  let overrides = loadOverrides();

  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? "");
  function loadOverrides(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  }
  function key(id){ return "rph-" + id; }
  function merged(r){
    return {...r, ...(overrides[key(r.id)] || {})};
  }
  function saveRph(r){
    const obj = {};
    fields.forEach(([k]) => obj[k] = r[k] ?? "");
    overrides[key(r.id)] = obj;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  }
  function toast(msg){
    const t=$("#toast"); t.textContent=msg; t.classList.add("show");
    clearTimeout(window.__toast); window.__toast=setTimeout(()=>t.classList.remove("show"),1800);
  }
  function renderWeeks(){
    $("#weekGrid").innerHTML = Array.from({length:43},(_,i)=>{
      const n=i+1;
      return `<button class="week-btn ${n===week?'active':''}" data-week="${n}">${n}</button>`;
    }).join("");
    document.querySelectorAll(".week-btn").forEach(b=>b.onclick=()=>{week=Number(b.dataset.week);localStorage.setItem("rph-current-week",week);render();});
  }
  function fieldHTML(r,[k,label,kind]){
    const cls = kind==="half"?"field half":kind==="third"?"field third":"field";
    const activity = kind==="activity";
    const val = esc(r[k]);
    return `<div class="${cls}">
      <label>${label}</label>
      ${activity ? `<textarea data-field="${k}" spellcheck="true">${val}</textarea>` :
                    `<input data-field="${k}" value="${val.replace(/"/g,'&quot;')}" spellcheck="true">`}
    </div>`;
  }
  function activityToHtml(text){
    const raw = String(text || "").replace(/\r/g,"").trim();
    if(!raw) return "";
    const lines = raw.split("\n").map(x=>x.trim()).filter(Boolean);
    const items = [];
    let current = "";

    for(const line of lines){
      const m = line.match(/^(?:[-•]\s*)?(\d+)[.)]\s*(.*)$/);
      if(m){
        if(current) items.push(current);
        current = m[2];
      }else if(/^[-•]\s+/.test(line) && current){
        current += " " + line.replace(/^[-•]\s+/,"");
      }else{
        if(current) current += " " + line;
        else current = line;
      }
    }
    if(current) items.push(current);

    if(!items.length) return `<p>${esc(raw).replace(/\n/g,"<br>")}</p>`;
    return `<ol class="print-activity">${items.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>`;
  }

  function printTable(r){
    const row = (label, value, cls="") =>
      `<tr><td class="label">${label}</td><td class="value ${cls}">${esc(value)}</td></tr>`;

    return `
      <div class="print-rph-title">RANCANGAN PENGAJARAN HARIAN (RPH)</div>
      <table class="print-table">
        ${row("Minggu", r.week)}
        ${row("Hari", r.hari)}
        ${row("Tarikh", r.tarikh)}
        ${row("Kelas", r.kelas)}
        ${row("Masa", r.masa)}
        ${row("Mata Pelajaran", r.mataPelajaran)}
        ${row("Tema", r.tema)}
        ${row("Topik", r.topik)}
        ${row("Standard Kandungan", r.standardKandungan)}
        ${row("Standard Pembelajaran", r.standardPembelajaran)}
        ${row("Objektif Pembelajaran", r.objektif)}
        `<tr><td class="label">Aktiviti PdP</td><td class="value">${activityToHtml(r.aktiviti)}</td></tr>`
        ${row("Pentaksiran", r.pentaksiran)}
        ${row("Bahan Bantu Belajar", r.bbb)}
        `<tr><td class="label">Refleksi</td><td class="value refleksi-cell">${esc(r.refleksi)}</td></tr>`
      </table>`;
  }

  function renderCard(r){
    r=merged(r);
    return `<article class="rph-card" data-id="${r.id}">
      <header class="rph-card-header no-print">
        <div>
          <div class="rph-number">RPH ${r.id} · Minggu ${r.week}</div>
          <div class="rph-title">${esc(r.title)}</div>
        </div>
        <div class="card-actions">
          <span class="saved-indicator"><i class="bi bi-check-circle"></i> Disimpan</span>
          <button class="mini-btn primary save-one"><i class="bi bi-check2"></i> Simpan</button>
          <button class="mini-btn reset-one"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>
        </div>
      </header>
      <div class="rph-body">
        <div class="form-grid no-print">
          ${fields.map(f=>fieldHTML(r,f)).join("")}
        </div>
        ${printTable(r)}
      </div>
    </article>`;
  }
  function render(){
    renderWeeks();
    const rs=RPH_DATA.filter(r=>r.week===week);
    $("#weekTitle").textContent=`Minggu ${week}`;
    $("#weekMeta").textContent=`${rs.length} RPH · Edit terus kandungan dan simpan pada peranti ini.`;
    $("#rphContainer").innerHTML=rs.map(renderCard).join("");
    bindCards();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function getCardData(card){
    const base=RPH_DATA.find(r=>r.id===Number(card.dataset.id));
    const r=merged(base);
    card.querySelectorAll("[data-field]").forEach(el=>r[el.dataset.field]=el.value);
    return r;
  }
  function bindCards(){
    document.querySelectorAll(".rph-card").forEach(card=>{
      card.querySelector(".save-one").onclick=()=>{
        saveRph(getCardData(card));
        const s=card.querySelector(".saved-indicator"); s.classList.add("show");
        setTimeout(()=>s.classList.remove("show"),1400);
        toast("RPH disimpan");
      };
      card.querySelector(".reset-one").onclick=()=>{
        const id=Number(card.dataset.id);
        if(!confirm("Reset RPH ini kepada kandungan asal?")) return;
        delete overrides[key(id)]; localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides));
        render(); toast("RPH telah direset");
      };
      card.querySelectorAll("[data-field]").forEach(el=>{
        el.addEventListener("input",()=>{
          // Autosave with debounce so edits survive accidental refresh.
          clearTimeout(el.__saveTimer);
          el.__saveTimer=setTimeout(()=>saveRph(getCardData(card)),500);
        });
      });
    });
  }
  $("#printBtn").onclick=()=>{
    document.querySelectorAll(".rph-card").forEach(card=>{
      const data=getCardData(card);
      saveRph(data);
      const printRoot=card.querySelector(".rph-body");
      const old=printRoot.querySelector(".print-table");
      const temp=document.createElement("div");
      temp.innerHTML=printTable(data);
      const freshTable=temp.querySelector(".print-table");
      const freshTitle=temp.querySelector(".print-rph-title");
      const oldTable=printRoot.querySelector(".print-table");
      const oldTitle=printRoot.querySelector(".print-rph-title");
      if(oldTable) oldTable.replaceWith(freshTable);
      else printRoot.appendChild(freshTable);
      if(oldTitle) oldTitle.replaceWith(freshTitle);
      else printRoot.insertBefore(freshTitle, printRoot.firstChild);
    });
    window.print();
  };
  $("#resetWeekBtn").onclick=()=>{
    if(!confirm(`Reset semua RPH bagi Minggu ${week} kepada kandungan asal?`)) return;
    RPH_DATA.filter(r=>r.week===week).forEach(r=>delete overrides[key(r.id)]);
    localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides)); render(); toast("Minggu telah direset");
  };
  $("#resetAllBtn").onclick=()=>{
    if(!confirm("Reset SEMUA 86 RPH kepada data asal?")) return;
    overrides={}; localStorage.removeItem(STORAGE_KEY); render(); toast("Semua RPH telah direset");
  };
  $("#exportBtn").onclick=()=>{
    const payload={app:"RPH Sains Tahun 4",version:1,exportedAt:new Date().toISOString(),overrides};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="backup-rph-sains-tahun4.json";a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),500);
    toast("Backup berjaya dieksport");
  };
  $("#importInput").onchange=e=>{
    const file=e.target.files?.[0]; if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const p=JSON.parse(reader.result);
        if(!p.overrides)throw new Error();
        overrides=p.overrides;localStorage.setItem(STORAGE_KEY,JSON.stringify(overrides));render();toast("Backup berjaya diimport");
      }catch{alert("Fail backup tidak sah.");}
      e.target.value="";
    };
    reader.readAsText(file);
  };
  render();
})();
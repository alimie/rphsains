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
  function renderCard(r){
    r=merged(r);
    return `<article class="rph-card" data-id="${r.id}">
      <header class="rph-card-header">
        <div>
          <div class="rph-number">RPH ${r.id} · Minggu ${r.week}</div>
          <div class="rph-title">${esc(r.title)}</div>
        </div>
        <div class="card-actions no-print">
          <span class="saved-indicator"><i class="bi bi-check-circle"></i> Disimpan</span>
          <button class="mini-btn primary save-one"><i class="bi bi-check2"></i> Simpan</button>
          <button class="mini-btn reset-one"><i class="bi bi-arrow-counterclockwise"></i> Reset</button>
        </div>
      </header>
      <div class="rph-body"><div class="form-grid">
        ${fields.map(f=>fieldHTML(r,f)).join("")}
      </div></div>
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
  $("#printBtn").onclick=()=>window.print();
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
(function () {
  "use strict";

  var DATA = window.RPH_DATA;
  var ENTRIES = DATA.entries;
  var TOTAL_WEEKS = 43;
  var STORAGE_KEY = "rph-edits-" + "t" + DATA.tahun + "-" + DATA.mataPelajaran.toLowerCase();
  var LAST_WEEK_KEY = "rph-last-week-" + "t" + DATA.tahun + "-" + DATA.mataPelajaran.toLowerCase();

  var edits = loadEdits();
  var currentWeek = loadLastWeek();

  var weekScroll = document.getElementById("weekScroll");
  var cardsContainer = document.getElementById("cardsContainer");
  var weekInfo = document.getElementById("weekInfo");
  var toast = document.getElementById("toast");
  var drawer = document.getElementById("dataDrawer");

  // ---------- storage helpers ----------

  function loadEdits() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function persistEdits() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edits));
    } catch (e) {
      showToast("Gagal menyimpan — storan penuh?");
    }
  }

  function loadLastWeek() {
    try {
      var w = parseInt(localStorage.getItem(LAST_WEEK_KEY), 10);
      if (w >= 1 && w <= TOTAL_WEEKS) return w;
    } catch (e) {}
    return 1;
  }

  function persistLastWeek(w) {
    try { localStorage.setItem(LAST_WEEK_KEY, String(w)); } catch (e) {}
  }

  // ---------- data helpers ----------

  function getOriginal(id) {
    for (var i = 0; i < ENTRIES.length; i++) {
      if (ENTRIES[i].id === id) return ENTRIES[i];
    }
    return null;
  }

  function getEntry(id) {
    if (edits[id]) return edits[id];
    return getOriginal(id);
  }

  function ensureEditable(id) {
    if (!edits[id]) {
      var orig = getOriginal(id);
      edits[id] = JSON.parse(JSON.stringify(orig));
    }
    return edits[id];
  }

  function isEdited(id) {
    return !!edits[id];
  }

  function entriesForWeek(week) {
    return ENTRIES.filter(function (e) { return e.minggu === week; })
      .sort(function (a, b) { return a.id - b.id; });
  }

  // ---------- week picker ----------

  function buildWeekChips() {
    var frag = document.createDocumentFragment();
    for (var w = 1; w <= TOTAL_WEEKS; w++) {
      var chip = document.createElement("button");
      chip.className = "week-chip";
      chip.type = "button";
      chip.textContent = w;
      chip.setAttribute("data-week", w);
      chip.setAttribute("aria-label", "Minggu " + w);
      chip.addEventListener("click", function () {
        selectWeek(parseInt(this.getAttribute("data-week"), 10));
      });
      frag.appendChild(chip);
    }
    weekScroll.appendChild(frag);
  }

  function refreshChipState() {
    var chips = weekScroll.querySelectorAll(".week-chip");
    chips.forEach(function (chip) {
      var w = parseInt(chip.getAttribute("data-week"), 10);
      chip.classList.toggle("active", w === currentWeek);
    });
    var active = weekScroll.querySelector(".week-chip.active");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }

  function selectWeek(w) {
    if (w < 1 || w > TOTAL_WEEKS) return;
    currentWeek = w;
    persistLastWeek(w);
    refreshChipState();
    renderWeek(w);
  }

  document.getElementById("weekPrev").addEventListener("click", function () {
    selectWeek(Math.max(1, currentWeek - 1));
  });
  document.getElementById("weekNext").addEventListener("click", function () {
    selectWeek(Math.min(TOTAL_WEEKS, currentWeek + 1));
  });

  // ---------- rendering ----------

  function el(tag, className, text) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  function editableSpan(id, field, value, opts) {
    opts = opts || {};
    var span = el(opts.tag || "div", opts.className || "editable");
    span.contentEditable = "true";
    span.setAttribute("data-id", id);
    span.setAttribute("data-field", field);
    span.setAttribute("spellcheck", "false");
    if (opts.placeholder) span.setAttribute("data-placeholder", opts.placeholder);
    span.textContent = value || "";
    bindEditable(span, id, field);
    return span;
  }

  function bindEditable(node, id, field) {
    var timer = null;
    node.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var val = node.textContent.replace(/\u00a0/g, " ");
        var target = ensureEditable(id);
        target[field] = val;
        persistEdits();
        markSaved(id);
      }, 350);
    });
    node.addEventListener("blur", function () {
      clearTimeout(timer);
      var val = node.textContent.replace(/\u00a0/g, " ");
      var target = ensureEditable(id);
      target[field] = val;
      persistEdits();
      markSaved(id);
    });
  }

  function markSaved(id) {
    var stateEl = cardsContainer.querySelector('.save-state[data-id="' + id + '"]');
    if (!stateEl) return;
    stateEl.textContent = "Disimpan pada peranti ini · " + nowTime();
    stateEl.classList.add("show", "edited");
  }

  function nowTime() {
    var d = new Date();
    return d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
  }

  function metaField(id, label, field, value, placeholder) {
    var wrap = el("div", "meta-field");
    wrap.appendChild(el("label", null, label));
    wrap.appendChild(editableSpan(id, field, value, { placeholder: placeholder, className: "blank" }));
    return wrap;
  }

  function fieldRow(id, eyebrowText, field, value, opts) {
    opts = opts || {};
    var wrap = el("div", "field-row");
    wrap.appendChild(el("p", "eyebrow", eyebrowText));
    wrap.appendChild(editableSpan(id, field, value, opts));
    return wrap;
  }

  function stepList(entry) {
    var wrap = el("div", "field-row");
    var head = el("div", null);
    head.style.display = "flex";
    head.style.justifyContent = "space-between";
    head.style.alignItems = "center";
    head.appendChild(el("p", "eyebrow", "Penyampaian / Eksplorasi"));
    wrap.appendChild(head);

    var ol = el("ol", "step-list");
    ol.setAttribute("data-steps-for", entry.id);
    (entry.penyampaian || []).forEach(function (stepText, idx) {
      ol.appendChild(stepItem(entry.id, idx, stepText));
    });
    wrap.appendChild(ol);

    var addBtn = el("button", "step-add no-print", "+ Tambah langkah");
    addBtn.type = "button";
    addBtn.addEventListener("click", function () {
      var target = ensureEditable(entry.id);
      target.penyampaian = target.penyampaian || [];
      target.penyampaian.push("");
      persistEdits();
      var ol2 = cardsContainer.querySelector('.step-list[data-steps-for="' + entry.id + '"]');
      var newIdx = target.penyampaian.length - 1;
      var item = stepItem(entry.id, newIdx, "");
      ol2.appendChild(item);
      item.querySelector(".step-text").focus();
      markSaved(entry.id);
    });
    wrap.appendChild(addBtn);
    return wrap;
  }

  function stepItem(id, idx, text) {
    var li = el("li", "step-item");
    li.setAttribute("data-idx", idx);
    var span = el("div", "step-text");
    span.contentEditable = "true";
    span.setAttribute("spellcheck", "false");
    span.textContent = text || "";
    var timer = null;
    span.addEventListener("input", function () {
      clearTimeout(timer);
      timer = setTimeout(function () { commitStep(id, li); }, 350);
    });
    span.addEventListener("blur", function () { commitStep(id, li); });
    li.appendChild(span);

    var rm = el("button", "step-remove no-print", "\u00d7");
    rm.type = "button";
    rm.setAttribute("aria-label", "Buang langkah ini");
    rm.addEventListener("click", function () {
      var target = ensureEditable(id);
      var i = Array.prototype.indexOf.call(li.parentNode.children, li);
      target.penyampaian.splice(i, 1);
      persistEdits();
      renderWeek(currentWeek);
    });
    li.appendChild(rm);
    return li;
  }

  function commitStep(id, li) {
    var target = ensureEditable(id);
    target.penyampaian = target.penyampaian || [];
    var i = Array.prototype.indexOf.call(li.parentNode.children, li);
    var val = li.querySelector(".step-text").textContent.replace(/\u00a0/g, " ");
    target.penyampaian[i] = val;
    persistEdits();
    markSaved(id);
  }

  function renderCard(entry) {
    var card = el("article", "rph-card");
    card.id = "rph-" + entry.id;

    var tag = el("div", "tag", "RPH " + entry.id + " \u00b7 MINGGU " + entry.minggu);
    card.appendChild(tag);

    card.appendChild(editableSpan(entry.id, "title", entry.title, { tag: "h2" }));
    cardTitleClass(card);

    card.appendChild(el("p", "rph-subtitle", (entry.tema || "") + (entry.topik ? "  \u2014  " + entry.topik : "")));

    // meta grid: fill-in-the-blank fields
    var grid = el("div", "meta-grid");
    grid.appendChild(metaField(entry.id, "Hari", "hari", entry.hari, "cth: Isnin"));
    grid.appendChild(metaField(entry.id, "Tarikh", "tarikh", entry.tarikh, "cth: 12 Jan"));
    grid.appendChild(metaField(entry.id, "Kelas", "kelas", entry.kelas, "cth: 4 Cerdik"));
    grid.appendChild(metaField(entry.id, "Masa", "masa", entry.masa, "cth: 8.00-9.00"));
    card.appendChild(grid);

    card.appendChild(fieldRow(entry.id, "Tema", "tema", entry.tema));
    card.appendChild(fieldRow(entry.id, "Topik", "topik", entry.topik));
    card.appendChild(fieldRow(entry.id, "Standard Kandungan", "standardKandungan", entry.standardKandungan));
    card.appendChild(fieldRow(entry.id, "Standard Pembelajaran", "standardPembelajaran", entry.standardPembelajaran));
    card.appendChild(fieldRow(entry.id, "Objektif Pembelajaran", "objektifPembelajaran", entry.objektifPembelajaran));
    card.appendChild(fieldRow(entry.id, "Kriteria Kejayaan", "kriteriaKejayaan", entry.kriteriaKejayaan));

    // Aktiviti PdP block
    var activityBlock = el("div", "section-block");
    activityBlock.appendChild(el("p", "subhead", "Aktiviti PdP"));
    activityBlock.appendChild(fieldRow(entry.id, "Set Induksi", "setInduksi", entry.setInduksi));
    activityBlock.appendChild(stepList(entry));
    activityBlock.appendChild(fieldRow(entry.id, "Penutup", "penutup", entry.penutup));
    card.appendChild(activityBlock);

    var assessBlock = el("div", "section-block");
    assessBlock.appendChild(fieldRow(entry.id, "Pentaksiran", "pentaksiran", entry.pentaksiran));
    assessBlock.appendChild(fieldRow(entry.id, "Bahan Bantu Belajar", "bahanBantuBelajar", entry.bahanBantuBelajar));
    card.appendChild(assessBlock);

    var reflectRow = fieldRow(entry.id, "Refleksi", "refleksi", entry.refleksi, {
      tag: "textarea",
      placeholder: "cth: 28/30 murid mencapai objektif pembelajaran..."
    });
    // convert to textarea for refleksi specifically (multi-line notes)
    var reflectField = reflectRow.querySelector(".editable");
    var textarea = document.createElement("textarea");
    textarea.className = "editable";
    textarea.rows = 2;
    textarea.setAttribute("data-id", entry.id);
    textarea.setAttribute("data-field", "refleksi");
    textarea.placeholder = "cth: 28/30 murid mencapai objektif pembelajaran...";
    textarea.value = entry.refleksi || "";
    bindEditableTextarea(textarea, entry.id, "refleksi");
    reflectField.replaceWith(textarea);
    card.appendChild(reflectRow);

    // footer
    var footer = el("div", "card-footer");
    var state = el("span", "save-state", isEdited(entry.id) ? "Ada suntingan tersimpan" : "");
    state.setAttribute("data-id", entry.id);
    if (isEdited(entry.id)) state.classList.add("show", "edited");
    footer.appendChild(state);

    var resetBtn = el("button", "btn btn-ghost btn-sm no-print", "\u21a9 Set semula RPH ini");
    resetBtn.type = "button";
    resetBtn.addEventListener("click", function () {
      if (!isEdited(entry.id)) return;
      if (confirm("Set semula RPH " + entry.id + " kepada teks asal? Suntingan akan hilang.")) {
        delete edits[entry.id];
        persistEdits();
        renderWeek(currentWeek);
        showToast("RPH " + entry.id + " diset semula");
      }
    });
    footer.appendChild(resetBtn);

    card.appendChild(footer);
    return card;
  }

  function cardTitleClass(card) {
    var h2 = card.querySelector("h2");
    if (h2) h2.classList.add("rph-title");
  }

  function bindEditableTextarea(node, id, field) {
    var timer = null;
    function autoGrow() {
      node.style.height = "auto";
      node.style.height = node.scrollHeight + "px";
    }
    autoGrow();
    node.addEventListener("input", function () {
      autoGrow();
      clearTimeout(timer);
      timer = setTimeout(function () {
        var target = ensureEditable(id);
        target[field] = node.value;
        persistEdits();
        markSaved(id);
      }, 350);
    });
    node.addEventListener("blur", function () {
      clearTimeout(timer);
      var target = ensureEditable(id);
      target[field] = node.value;
      persistEdits();
      markSaved(id);
    });
  }

  function renderWeek(week) {
    cardsContainer.innerHTML = "";
    var list = entriesForWeek(week).map(function (e) { return getEntry(e.id); });
    // keep original ordering by id even after edits
    list.sort(function (a, b) { return a.id - b.id; });

    if (!list.length) {
      var empty = el("div", "empty-state", "Tiada RPH untuk minggu ini.");
      cardsContainer.appendChild(empty);
    } else {
      list.forEach(function (entry) {
        cardsContainer.appendChild(renderCard(entry));
      });
    }
    var range = list.length ? ("RPH " + list[0].id + (list.length > 1 ? "\u2013" + list[list.length - 1].id : "")) : "\u2014";
    weekInfo.innerHTML = "<b>Minggu " + week + "</b> \u00b7 " + range + " \u00b7 " + DATA.entries.length + " RPH sepanjang tahun";
  }

  // ---------- toast ----------

  var toastTimer = null;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2200);
  }

  // ---------- print (dedicated table-based RPH format) ----------

  function escHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escMultiline(str) {
    return escHtml(str).replace(/\r\n|\r|\n/g, "<br>");
  }

  function escSemicolonList(str) {
    return escHtml(str).split(/;\s*/).join("<br>");
  }

  function buildPrintTable(entry) {
    var steps = (entry.penyampaian || [])
      .map(function (s, i) { return "<li>Langkah " + (i + 1) + ": " + escHtml(s) + "</li>"; })
      .join("\n");

    var table = (
      "<h1>RANCANGAN PENGAJARAN HARIAN (RPH)</h1>\n" +
      "<table>\n" +
      "<tr><td class=\"label\">Minggu</td><td>" + entry.minggu + "</td></tr>\n" +
      "<tr><td class=\"label\">Hari</td><td>" + escHtml(entry.hari) + "</td></tr>\n" +
      "<tr><td class=\"label\">Tarikh</td><td>" + escHtml(entry.tarikh) + "</td></tr>\n" +
      "<tr><td class=\"label\">Kelas</td><td>" + escHtml(entry.kelas) + "</td></tr>\n" +
      "<tr><td class=\"label\">Masa</td><td>" + escHtml(entry.masa) + "</td></tr>\n" +
      "<tr><td class=\"label\">Mata Pelajaran</td><td>" + escHtml(entry.mataPelajaran) + "</td></tr>\n" +
      "<tr><td class=\"label\">Tema</td><td>" + escHtml(entry.tema) + "</td></tr>\n" +
      "<tr><td class=\"label\">Topik</td><td>" + escHtml(entry.topik) + "</td></tr>\n" +
      "<tr><td class=\"label\">Standard Kandungan</td><td>" + escHtml(entry.standardKandungan) + "</td></tr>\n" +
      "<tr><td class=\"label\">Standard Pembelajaran</td><td>" + escSemicolonList(entry.standardPembelajaran) + "</td></tr>\n" +
      "<tr><td class=\"label\">Objektif Pembelajaran</td><td>" + escHtml(entry.objektifPembelajaran) + "</td></tr>\n" +
      "<tr>\n<td class=\"label\">Aktiviti PdP</td>\n<td>\n<ol>\n" +
      "<li>Set Induksi: " + escHtml(entry.setInduksi) + "</li>\n" +
      steps + "\n" +
      "<li>Penutup: " + escHtml(entry.penutup) + "</li>\n" +
      "</ol>\n</td>\n</tr>\n" +
      "<tr><td class=\"label\">Pentaksiran</td><td>" + escHtml(entry.pentaksiran) + "</td></tr>\n" +
      "<tr><td class=\"label\">Bahan Bantu Belajar</td><td>" + escHtml(entry.bahanBantuBelajar) + "</td></tr>\n" +
      "<tr><td class=\"label\">Refleksi</td><td class=\"refleksi\">" + escMultiline(entry.refleksi) + "</td></tr>\n" +
      "</table>"
    );

    // .print-page is fixed to the printable page-content box; .print-page-inner
    // is what gets measured and, if needed, scaled down to fit — see
    // fitPrintPagesToOnePage() below. This is what removes the need to
    // manually drop the browser's print "scale" to 90% or less.
    return '<div class="print-page"><div class="print-page-inner">' + table + '</div></div>';
  }

  function buildPrintDocument(week) {
    var list = entriesForWeek(week).map(function (e) { return getEntry(e.id); })
      .sort(function (a, b) { return a.id - b.id; });
    return list.map(buildPrintTable).join('\n');
  }

  // Keep these in sync with the #printArea .print-page CSS rules.
  var PRINT_MARGIN_MM = 16;
  var PRINT_PAGE_HEIGHT_MM = 297 - PRINT_MARGIN_MM * 2;
  var MM_TO_PX = 96 / 25.4; // CSS reference pixel: 1mm = 96/25.4px at 1x
  var PRINT_MIN_SCALE = 0.72; // legibility floor; beyond this we let it spill to a 2nd page

  function fitPrintPagesToOnePage(printArea) {
    // Render off-screen (not display:none) so heights are measurable, without
    // ever flashing on screen or affecting normal document flow/scroll.
    printArea.style.display = "block";
    printArea.style.position = "fixed";
    printArea.style.left = "-99999px";
    printArea.style.top = "0";
    printArea.style.visibility = "hidden";

    var maxHeightPx = PRINT_PAGE_HEIGHT_MM * MM_TO_PX;
    var pages = printArea.querySelectorAll(".print-page");
    pages.forEach(function (page) {
      var inner = page.querySelector(".print-page-inner");
      inner.style.transform = "";
      page.style.height = "";
      page.style.overflow = "";

      var naturalHeight = inner.scrollHeight;
      if (naturalHeight > maxHeightPx) {
        var requiredScale = maxHeightPx / naturalHeight;
        if (requiredScale >= PRINT_MIN_SCALE) {
          // fits within our legibility floor: scale down and clamp to one page
          inner.style.transform = "scale(" + requiredScale + ")";
          page.style.height = maxHeightPx + "px";
          page.style.overflow = "hidden";
        }
        // else: even the floor scale wouldn't fit. Leave unscaled/unclamped
        // so it spills naturally onto a second page — never silently clip
        // or hide content just to force a single page.
      }
    });

    // Reset inline overrides; #printArea's real print visibility is handled
    // entirely by the @media print rule (display:none the rest of the time).
    printArea.style.display = "";
    printArea.style.position = "";
    printArea.style.left = "";
    printArea.style.top = "";
    printArea.style.visibility = "";
  }

  document.getElementById("printBtn").addEventListener("click", function () {
    var printArea = document.getElementById("printArea");
    printArea.innerHTML = buildPrintDocument(currentWeek);
    requestAnimationFrame(function () {
      fitPrintPagesToOnePage(printArea);
      requestAnimationFrame(function () {
        window.print();
      });
    });
  });

  // ---------- data drawer: backup / restore / reset all ----------

  document.getElementById("menuBtn").addEventListener("click", function () {
    drawer.classList.toggle("open");
  });

  document.getElementById("exportBtn").addEventListener("click", function () {
    var merged = ENTRIES.map(function (e) { return getEntry(e.id); });
    var payload = {
      tahun: DATA.tahun,
      mataPelajaran: DATA.mataPelajaran,
      sesi: DATA.sesi,
      sekolah: DATA.sekolah,
      entries: merged
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var d = new Date();
    var stamp = d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
    a.href = url;
    a.download = "rph-" + DATA.mataPelajaran.toLowerCase() + "-tahun" + DATA.tahun + "-sandaran-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Sandaran dimuat turun");
  });

  document.getElementById("importInput").addEventListener("change", function (evt) {
    var file = evt.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var parsed = JSON.parse(reader.result);
        if (!parsed.entries || !Array.isArray(parsed.entries)) throw new Error("format tidak sah");

        // Guard against restoring another year's backup onto this year's page.
        // Every year shares the same entry ids (1..86), so a Year 6 backup
        // dropped on the Year 4 page would silently overwrite all Year 4 work.
        if (parsed.tahun !== undefined && Number(parsed.tahun) !== Number(DATA.tahun)) {
          alert(
            "Sandaran ini untuk Tahun " + parsed.tahun + ", tetapi halaman ini Tahun " +
            DATA.tahun + ".\n\nImport dibatalkan supaya suntingan Tahun " + DATA.tahun +
            " tidak ditimpa. Buka halaman Tahun " + parsed.tahun + " dahulu, kemudian muat naik semula."
          );
          evt.target.value = "";
          return;
        }
        if (parsed.mataPelajaran !== undefined &&
            String(parsed.mataPelajaran).toLowerCase() !== String(DATA.mataPelajaran).toLowerCase()) {
          alert(
            "Sandaran ini untuk mata pelajaran " + parsed.mataPelajaran +
            ", tetapi halaman ini " + DATA.mataPelajaran + ".\n\nImport dibatalkan."
          );
          evt.target.value = "";
          return;
        }

        var applied = 0;
        parsed.entries.forEach(function (entry) {
          if (getOriginal(entry.id)) { edits[entry.id] = entry; applied++; }
        });
        persistEdits();
        renderWeek(currentWeek);
        showToast("Sandaran berjaya dimuat naik · " + applied + " RPH");
      } catch (e) {
        showToast("Gagal membaca fail sandaran");
      }
      evt.target.value = "";
    };
    reader.readAsText(file, "utf-8");
  });

  document.getElementById("resetAllBtn").addEventListener("click", function () {
    if (confirm("Set semula SEMUA RPH kepada teks asal? Semua suntingan pada peranti ini akan dipadam.")) {
      edits = {};
      persistEdits();
      renderWeek(currentWeek);
      showToast("Semua RPH diset semula");
    }
  });

  // ---------- init ----------

  buildWeekChips();
  refreshChipState();
  renderWeek(currentWeek);
})();

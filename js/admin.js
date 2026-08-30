/* Barbero Taiib — admin dashboard logic (localStorage, real-time across tabs) */
(function () {
  "use strict";

  /* ================= AUTH ================= */
  var AUTH_KEY = "bt_auth";
  var PASS_KEY = "bt_pass";
  var DEFAULT_PASS = "taiib2026";

  function fallbackHash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return "fb" + Math.abs(h).toString(16);
  }

  function sha256(str) {
    if (window.crypto && crypto.subtle && crypto.subtle.digest) {
      return crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)).then(function (buf) {
        return Array.prototype.map.call(new Uint8Array(buf), function (b) {
          return ("0" + b.toString(16)).slice(-2);
        }).join("");
      });
    }
    return Promise.resolve(fallbackHash(str));
  }

  function currentPassHash() {
    var saved = localStorage.getItem(PASS_KEY);
    if (saved) return Promise.resolve(saved);
    return sha256(DEFAULT_PASS);
  }

  function isAuthed() {
    return localStorage.getItem(AUTH_KEY) === "1";
  }

  function showApp() {
    document.getElementById("adminNav").style.display = "flex";
    document.getElementById("adminMain").style.display = "block";
    document.getElementById("loginScreen").style.display = "none";
    renderOrders();
  }

  function showLogin() {
    document.getElementById("adminNav").style.display = "none";
    document.getElementById("adminMain").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";
  }

  var loginBtn = document.getElementById("loginBtn");
  var loginPass = document.getElementById("loginPass");
  var loginErr = document.getElementById("loginErr");

  function tryLogin(pass) {
    loginErr.textContent = "";
    if (!pass) { loginErr.textContent = "دخّل كلمة السر"; return; }
    Promise.all([sha256(pass), currentPassHash()]).then(function (res) {
      if (res[0] === res[1]) {
        localStorage.setItem(AUTH_KEY, "1");
        showApp();
        loginPass.value = "";
      } else {
        loginErr.textContent = "❌ كلمة السر غالطة. عقر ديك أثناء.";
      }
    });
  }

  loginBtn.addEventListener("click", function () { tryLogin(loginPass.value); });
  loginPass.addEventListener("keydown", function (e) {
    if (e.key === "Enter") tryLogin(loginPass.value);
  });

  document.getElementById("logoutBtn").addEventListener("click", function (e) {
    e.preventDefault();
    localStorage.removeItem(AUTH_KEY);
    showLogin();
  });

  document.getElementById("changePass").addEventListener("click", function (e) {
    e.preventDefault();
    var old = prompt("كلمة السر الحالية:");
    if (old === null) return;
    Promise.all([sha256(old), currentPassHash()]).then(function (res) {
      if (res[0] !== res[1]) { alert("❌ كلمة السر الحالية غالطة"); return; }
      var np = prompt("كلمة السر الجديدة (على الأقل 6 حروف):");
      if (!np || np.length < 6) { alert("كلمة السر قصيرة أو ملغية"); return; }
      var np2 = prompt("أعيد كلمة السر الجديدة:");
      if (np !== np2) { alert("كلمتا السر ماشي متطابقتين"); return; }
      sha256(np).then(function (h) {
        localStorage.setItem(PASS_KEY, h);
        alert("✅ تبدلات كلمة السر بنجاح");
      });
    });
  });

  if (isAuthed()) { showApp(); } else { showLogin(); }

  /* ================= MAIN APP (only visible when authed) ================= */

  /* ---------- Tabs ---------- */
  var tabs = document.getElementById("tabs");
  tabs.addEventListener("click", function (e) {
    var btn = e.target.closest(".tab");
    if (!btn) return;
    document.querySelectorAll(".tab").forEach(function (t) { t.classList.remove("active"); });
    document.querySelectorAll(".tab-panel").forEach(function (p) { p.classList.remove("active"); });
    btn.classList.add("active");
    document.getElementById("tab-" + btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "gallery") renderGalleryAdmin();
    if (btn.dataset.tab === "services") renderServicesEditor();
  });

  /* ================= ORDERS ================= */
  var tbody = document.getElementById("ordersBody");
  var search = document.getElementById("search");
  var filterStatus = document.getElementById("filterStatus");
  var autoWa = document.getElementById("autoWa");

  function fmtPhone(p) {
    var d = String(p || "").replace(/[^0-9]/g, "");
    if (d.length >= 12 && d.indexOf("212") === 0) {
      return "+" + d.slice(0, 3) + " " + d.slice(3, 6) + "-" + d.slice(6, 9) + "-" + d.slice(9);
    }
    return p;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDateStr(date) {
    var d = date ? new Date(date + "T00:00:00") : null;
    if (!d || isNaN(d)) return date;
    return d.toLocaleDateString("ar", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }

  function renderOrders() {
    var q = search.value.trim().toLowerCase();
    var f = filterStatus.value;
    var orders = getOrders().filter(function (o) {
      if (f && o.status !== f) return false;
      if (q) {
        var hay = (o.client_name + " " + o.client_phone).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      return true;
    });

    var all = getOrders();
    document.getElementById("cTotal").textContent = all.length;
    document.getElementById("cPending").textContent = all.filter(function (o) { return o.status === "Pending"; }).length;
    document.getElementById("cConfirmed").textContent = all.filter(function (o) { return o.status === "Confirmed"; }).length;
    document.getElementById("cCompleted").textContent = all.filter(function (o) { return o.status === "Completed"; }).length;
    document.getElementById("cCancelled").textContent = all.filter(function (o) { return o.status === "Cancelled"; }).length;

    if (!orders.length) {
      tbody.innerHTML = '<tr class="empty"><td colspan="7">لا توجد طلبات مطابقة.</td></tr>';
      return;
    }

    var html = "";
    orders.forEach(function (o) {
      var st = STATUS_FLOW[o.status] || { label: o.status, class: "" };
      var showApprove = o.status === "Pending";
      var showReject = o.status === "Pending";
      var showComplete = o.status === "Confirmed";
      html +=
        "<tr data-id='" + esc(o.order_id) + "'>" +
          "<td><strong>" + esc(o.order_id) + "</strong></td>" +
          "<td>" + esc(o.client_name) + "</td>" +
          "<td class='ltr'>" + esc(fmtPhone(o.client_phone)) + "</td>" +
          "<td>" + esc(serviceLabel(o.service_type)) + "</td>" +
          "<td>" + esc(fmtDateStr(o.appointment_date)) + " — <span dir='ltr'>" + esc(o.appointment_time) + "</span></td>" +
          "<td><span class='status " + st.class + "'>" + esc(st.label) + "</span></td>" +
          "<td><div class='row-actions'>" +
            (showApprove ? "<button class='btn btn-green btn-sm act' data-act='Confirmed'>الموافقة ✓</button>" : "") +
            (showReject ? "<button class='btn btn-red btn-sm act' data-act='Cancelled'>الرفض ✕</button>" : "") +
            (showComplete ? "<button class='btn btn-blue btn-sm act' data-act='Completed'>إتمام ✓✓</button>" : "") +
            "<button class='btn ghost btn-sm wa' data-tpl='" + (STATUS_FLOW[o.status] ? STATUS_FLOW[o.status].template : "booking_confirmed") + "'>📣 WhatsApp</button>" +
          "</div></td>" +
        "</tr>";
    });
    tbody.innerHTML = html;
  }

  tbody.addEventListener("click", function (e) {
    var btn = e.target.closest("button");
    if (!btn) return;
    var tr = btn.closest("tr[data-id]");
    var order = getOrders().find(function (o) { return o.order_id === tr.dataset.id; });
    if (!order) return;
    if (btn.classList.contains("act")) {
      var newStatus = btn.dataset.act;
      if (order.status === newStatus) return;
      order = updateOrderStatus(order.order_id, newStatus);
      renderOrders();
      if (autoWa.checked) openWhatsApp(order, STATUS_FLOW[newStatus].template);
    } else if (btn.classList.contains("wa")) {
      openWhatsApp(order, btn.dataset.tpl);
    }
  });

  search.addEventListener("input", renderOrders);
  filterStatus.addEventListener("change", renderOrders);
  window.addEventListener("storage", function (e) {
    if (e.key === "bt_orders") renderOrders();
  });
  setInterval(renderOrders, 3000);
  document.getElementById("eraseAll").addEventListener("click", function () {
    if (confirm("متأكد بغيتي تمسح جميع الطلبات؟")) {
      localStorage.removeItem("bt_orders");
      renderOrders();
    }
  });

  /* ================= SERVICES & PRICES ================= */
  var servicesMsg = document.getElementById("servicesMsg");
  var servicesSaving = false;

  function renderServicesEditor() {
    var body = document.getElementById("servicesBody");
    var grid = effectiveServices().filter(function (s) { return s.id !== "other"; });
    var html = "";
    grid.forEach(function (s) {
      html +=
        "<tr data-id='" + esc(s.id) + "'>" +
          "<td>" + esc(s.label) + "</td>" +
          "<td><input type='text' class='svc-label' data-field='label' value='" + esc(s.label) + "'></td>" +
          "<td><input type='text' class='svc-price' data-field='price' value='" + esc(s.price) + "' dir='ltr' style='width:120px;'></td>" +
          "<td><input type='url' class='svc-img' data-field='img' value='" + esc(s.img) + "' dir='ltr'></td>" +
        "</tr>";
    });
    body.innerHTML = html;
  }

  document.getElementById("saveServices").addEventListener("click", function () {
    if (servicesSaving) return;
    servicesSaving = true;
    servicesMsg.textContent = "";
    var cfg = [];
    document.querySelectorAll("#servicesBody tr[data-id]").forEach(function (tr) {
      cfg.push({
        id: tr.dataset.id,
        label: tr.querySelector(".svc-label").value.trim() || tr.dataset.id,
        price: tr.querySelector(".svc-price").value.trim(),
        img: tr.querySelector(".svc-img").value.trim()
      });
    });
    saveServicesCfg(cfg);
    servicesMsg.textContent = "✅ تم الحفظ — الصفحة الرئيسية تحدّثت";
    setTimeout(function () {
      servicesMsg.textContent = "";
      servicesSaving = false;
    }, 3000);
  });

  document.getElementById("resetServices").addEventListener("click", function () {
    if (!confirm("متأكد بغيتي ترجع للأسعار والصور الافتراضية؟")) return;
    localStorage.removeItem("bt_services");
    servicesMsg.textContent = "↩️ رجعنا للافتراضي";
    setTimeout(function () { servicesMsg.textContent = ""; }, 2500);
    renderServicesEditor();
  });

  /* ================= GALLERY ================= */
  var galUrl = document.getElementById("galUrl");
  var galTitle = document.getElementById("galTitle");
  var galFile = document.getElementById("galFile");
  var galFileTitle = document.getElementById("galFileTitle");

  function renderGalleryAdmin() {
    var grid = document.getElementById("galAdminGrid");
    var items = effectiveGallery();
    if (!items.length) {
      grid.innerHTML = '<p class="empty">لا توجد صور — زيد ديالك من فوق.</p>';
      return;
    }
    var html = "";
    items.forEach(function (it, i) {
      html +=
        "<figure class='g-item" + (i === 0 ? " g-wide" : "") + "'>" +
          "<button class='g-del' data-id='" + esc(it.id) + "' title='حذف'>🗑</button>" +
          "<img src='" + esc(it.src) + "' alt='" + esc(it.title || "") + "' loading='lazy' onerror=\"this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%23322a25%22/%3E%3C/svg%3E'\">" +
          "<figcaption>" + esc(it.title || "") + "</figcaption>" +
        "</figure>";
    });
    grid.innerHTML = html;
  }

  function addGalleryItem(src, title) {
    var items = effectiveGallery();
    items.push({ id: "g" + Date.now(), title: title || "صورة من الصالون", src: src });
    saveGalleryCfg(items);
    galUrl.value = "";
    galTitle.value = "";
    galFile.value = "";
    galFileTitle.value = "";
    renderGalleryAdmin();
  }

  document.getElementById("addGalUrl").addEventListener("click", function () {
    var url = galUrl.value.trim();
    if (!url) { alert("دخّل رابط الصورة أولاً"); return; }
    addGalleryItem(url, galTitle.value.trim());
  });

  document.getElementById("addGalFile").addEventListener("click", function () {
    if (!galFile.files || !galFile.files.length) { alert("اختر صورة من الحاسوب أولاً"); return; }
    var file = galFile.files[0];
    if (file.size > 1200000) {
      alert("⚠️ الصورة كبيرة (فوق 1.2MB). إرفع نسخة أصغر — الكبيرة قد ما تبقاش فالمتصفح.");
      return;
    }
    var reader = new FileReader();
    reader.onload = function () {
      addGalleryItem(reader.result, galFileTitle.value.trim());
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("galAdminGrid").addEventListener("click", function (e) {
    var btn = e.target.closest(".g-del");
    if (!btn) return;
    if (!confirm("تحذف هاد الصورة من الصفحة؟")) return;
    var items = getSettings(GALLERY_KEY, null) || effectiveGallery();
    items = items.filter(function (it) { return it.id !== btn.dataset.id; });
    if (!items.length) localStorage.removeItem(GALLERY_KEY);
    else saveGalleryCfg(items);
    renderGalleryAdmin();
  });

  /* init */
  renderOrders();
})();
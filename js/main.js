/* Barbero Taiib — landing page logic */
(function () {
  "use strict";

  function fmtPhone(p) {
    return "+" + p.replace(/^\+/, "").replace(/^2126/, "212 6").replace(/(\d{2})(\d{2})(\d{2})(\d{2})$/, "$1-$2-$3");
  }

  /* Social links */
  var waBase = "https://wa.me/" + BARBERSHOP.whatsapp;
  var heroBtn = document.getElementById("waHeroBtn");
  var waInfoBtn = document.getElementById("waInfoBtn");
  if (heroBtn) heroBtn.href = waBase + "?text=" + encodeURIComponent("سلام، عندي سؤال 🌟");
  if (waInfoBtn) waInfoBtn.href = waBase + "?text=" + encodeURIComponent("سلام، بغيت نعرف المزيد 👋");
  document.getElementById("phoneInfo").textContent = BARBERSHOP.phoneDisplay;
  document.getElementById("hoursInfo").textContent = BARBERSHOP.hours;
  document.getElementById("year").textContent = new Date().getFullYear();

  /* Services grid (uses admin settings when available) */
  var grid = document.getElementById("servicesGrid");
  var svcIcons = {
    "haircut": "✂️",
    "beard trim": "🧔",
    "facial": "✨",
    "haircut and beard": "💈",
    "other": "👌"
  };
  effectiveServices().forEach(function (s) {
    var el = document.createElement("div");
    el.className = "service";
    el.innerHTML =
      '<img class="s-img" src="' + s.img + '" alt="' + s.label + '" loading="lazy" onerror="this.classList.add(\'img-fallback\')">' +
      '<div class="s-body">' +
        '<h3>' + svcIcons[s.id] + ' ' + s.label + '</h3>' +
        '<div class="price">' + s.price + '</div>' +
        '<span class="s-tag">' + (s.description || "احجزي الموعد ديالك") + '</span>' +
      '</div>';
    grid.appendChild(el);
  });

  /* Gallery (dynamic from admin settings) */
  var galGrid = document.getElementById("galleryGrid");
  effectiveGallery().forEach(function (item, i) {
    var fig = document.createElement("figure");
    fig.className = "g-item" + (i === 0 ? " g-wide" : "");
    fig.innerHTML =
      '<img src="' + item.src + '" alt="' + (item.title || "Barbero Taiib") + '" loading="lazy" onerror="this.classList.add(\'img-fallback\')">' +
      '<figcaption>' + (item.title || "") + '</figcaption>';
    galGrid.appendChild(fig);
  });

  /* Service select */
  var select = document.getElementById("service");
  effectiveServices().forEach(function (s) {
    var o = document.createElement("option");
    o.value = s.id;
    o.textContent = s.label + " — " + s.price;
    select.appendChild(o);
  });

  /* Date min = today */
  var dateInput = document.getElementById("date");
  dateInput.min = new Date().toISOString().split("T")[0];

  /* Toast helper */
  var toast = document.getElementById("toast");
  var toastMsg = document.getElementById("toastMsg");
  var toastWa = document.getElementById("toastWa");
  var toastTimer = null;
  function showToast(html, waHref) {
    toastMsg.innerHTML = html;
    if (waHref) {
      toastWa.href = waHref;
      toastWa.style.display = "inline-block";
    } else {
      toastWa.style.display = "none";
    }
    toast.classList.add("show");
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 12000);
  }

  /* Booking submission */
  document.getElementById("bookingForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("name").value.trim();
    var phone = document.getElementById("phone").value.trim();
    var service = document.getElementById("service").value;
    var date = document.getElementById("date").value;
    var time = document.getElementById("time").value;

    if (!name || !phone || !date || !time) {
      showToast("⚠️ عيمّر جميع الخانات المطلوبة من فضلك.", null);
      return;
    }
    if (!/^\+?[0-9\s-]{9,15}$/.test(phone)) {
      showToast("⚠️ رقم الهاتف غير صالح. مثال: 0612345678", null);
      return;
    }

    var order = addOrder({
      client_name: name,
      client_phone: phone.replace(/[^0-9+]/g, ""),
      service_type: service,
      appointment_date: date,
      appointment_time: time
    });

    /* Keep shop data consistent with orders.json export too */
    var pending = calculatePending();
    var waMsg = buildMessage("booking_received", order, false) +
      "\n\n✅ رقم الطلب: " + order.order_id + "\n📋 الحالة: قيد الانتظار";
    var waHref = waBase + "?text=" + encodeURIComponent(waMsg);

    showToast(
      "<strong>تم استلام طلبك بنجاح ✅</strong><br>" +
      "رقم الطلب: <strong>" + order.order_id + "</strong> — الحالة: قيد الانتظار.<br>" +
      "اضغط الزر لترسل الطلب للصالون عبر واتساب.",
      waHref
    );

    e.target.reset();
    dateInput.min = new Date().toISOString().split("T")[0];
    document.getElementById("name").focus();
  });

  function calculatePending() {
    /* no-op: reserved for future dashboard sync */
    return getOrders().filter(function (o) { return o.status === "Pending"; }).length;
  }
})();
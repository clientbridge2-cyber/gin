/* Barbero Taiib — shared business config + order store (localStorage) */
const BARBERSHOP = {
  name: "Barbero Taiib",
  tagline: "صالون الحلاقة ديالك",
  phoneDisplay: "+212 602-714889",
  whatsapp: "212602714889",
  instagram: "barbero__taiib",
  maps: "https://maps.google.com/?q=35.17755,2.92598",
  coordinates: "35.17755° N, 2.92598° W",
  hours: "السبت - الأربعاء: 9:00 - 21:00"
};

const SERVICES = [
  { id: "haircut", label: "حلاقة شعر", price: "60 درهم", img: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=800&q=70" },
  { id: "beard trim", label: "تهذيب لحية", price: "40 درهم", img: "https://images.unsplash.com/photo-1587909209111-5097ee578ec3?w=800&q=70" },
  { id: "facial", label: "عناية بالوجه", price: "80 درهم", img: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=70" },
  { id: "haircut and beard", label: "حلاقة + لحية", price: "90 درهم", img: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=800&q=70" },
  { id: "other", label: "خدمة أخرى", price: "اتصل بنا", img: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=70" }
];

const ORDER_KEY = "bt_orders";
const SERVICES_KEY = "bt_services";
const GALLERY_KEY = "bt_gallery";

const DEFAULT_GALLERY = [
  { id: "g1", title: "أجواء الصالون", src: "https://images.unsplash.com/photo-1622287162716-f311baa1a2b8?w=1200&q=70" },
  { id: "g2", title: "أدوات معقمة", src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=800&q=70" },
  { id: "g3", title: "حلاقة احترافية", src: "https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=800&q=70" }
];

function getSettings(key, fallback) {
  try {
    var v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveSettings(key, val) {
  localStorage.setItem(key, JSON.stringify(val));
  return val;
}

/* Services: admin can override defaults */
function effectiveServices() {
  var cfg = getSettings(SERVICES_KEY, null);
  return (cfg && cfg.length) ? cfg : SERVICES;
}
function saveServicesCfg(cfg) { return saveSettings(SERVICES_KEY, cfg); }

/* Gallery: admin can publish their own photos */
function effectiveGallery() {
  var g = getSettings(GALLERY_KEY, null);
  return (g && g.length) ? g : DEFAULT_GALLERY;
}
function saveGalleryCfg(g) { return saveSettings(GALLERY_KEY, g); }
const STATUS_FLOW = {
  Pending: {
    label: "قيد الانتظار",
    class: "st-pending",
    template: "booking_received"
  },
  Confirmed: {
    label: "مؤكد",
    class: "st-confirmed",
    template: "booking_confirmed"
  },
  Completed: {
    label: "مكتمل",
    class: "st-completed",
    template: "reminder"
  },
  Cancelled: {
    label: "ملغي",
    class: "st-cancelled",
    template: "booking_cancelled"
  }
};

function waLink(message) {
  return "https://wa.me/" + BARBERSHOP.whatsapp + "?text=" + encodeURIComponent(message);
}

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(ORDER_KEY, JSON.stringify(orders));
  return orders;
}

function nextOrderId(orders) {
  var max = 0;
  orders.forEach(function (o) {
    var n = parseInt(String(o.order_id).replace(/\D/g, ""), 10);
    if (n > max) max = n;
  });
  return "BT-" + String(max + 1).padStart(4, "0");
}

function addOrder(data) {
  var orders = getOrders();
  var order = {
    order_id: nextOrderId(orders),
    client_name: data.client_name,
    client_phone: data.client_phone,
    service_type: data.service_type,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    created_at: new Date().toISOString(),
    status: "Pending"
  };
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

function updateOrderStatus(orderId, status) {
  var orders = getOrders();
  var order = orders.find(function (o) { return o.order_id === orderId; });
  if (!order) return null;
  order.status = status;
  saveOrders(orders);
  return order;
}

function serviceLabel(id) {
  var s = effectiveServices().find(function (x) { return x.id === id; });
  return s ? s.label : id;
}

/* WhatsApp templates (Darija) — keep in sync with whatsapp_templates.md */
function fillTemplate(name, ctx) {
  return name
    .replace("{client_name}", ctx.client_name)
    .replace("{service_type}", serviceLabel(ctx.service_type))
    .replace("{appointment_date}", ctx.appointment_date)
    .replace("{appointment_time}", ctx.appointment_time);
}

function buildMessage(templateKey, order, adminFirst) {
  var ctx = {
    client_name: order.client_name,
    service_type: order.service_type,
    appointment_date: order.appointment_date,
    appointment_time: order.appointment_time
  };
  var msg;
  switch (templateKey) {
    case "booking_received":
      msg = "سلام " + ctx.client_name + " 👋\n\n" +
        "تيقنّت طلب الحجز ديالك عندنا:\n" +
        "🚹 الخدمة: " + serviceLabel(ctx.service_type) + "\n" +
        "📅 التاريخ: " + ctx.appointment_date + "\n" +
        "⏰ الوقت: " + ctx.appointment_time + "\n\n" +
        "الطلب ديالك باقي قيد الانتظار (Pending)، غادي نرجعو ليك قريباً لمن التأكيد.";
      break;
    case "booking_confirmed":
      msg = "مزيان " + ctx.client_name + " 😊\n\n" +
        "الحجز ديالك تأكد بنجاح ✅\n" +
        "🚹 الخدمة: " + serviceLabel(ctx.service_type) + "\n" +
        "📅 التاريخ: " + ctx.appointment_date + "\n" +
        "⏰ الوقت: " + ctx.appointment_time + "\n\n" +
        "📌 موقعنا: " + BARBERSHOP.maps + "\n" +
        "📞 واتساب: wa.me/" + BARBERSHOP.whatsapp + "\n\nنتسناوك! 🔥";
      break;
    case "booking_cancelled":
      msg = "سلام " + ctx.client_name + " 👋\n\n" +
        "كنأسفو، الحجز ديالك ديال " + serviceLabel(ctx.service_type) +
        " (" + ctx.appointment_date + " الساعة " + ctx.appointment_time + ") تحلّق. 😕\n" +
        "إلى بغيتي تحجز وقت آخر، عيط لنا على: wa.me/" + BARBERSHOP.whatsapp;
      break;
    case "reminder":
      msg = "سلام " + ctx.client_name + " 👋 تذكير سريع!\n\n" +
        "الحجز ديالك قريب:\n" +
        "🚹 الخدمة: " + serviceLabel(ctx.service_type) + "\n" +
        "📅 التاريخ: " + ctx.appointment_date + "\n" +
        "⏰ الوقت: " + ctx.appointment_time + "\n\n" +
        "📌 الموقع: " + BARBERSHOP.maps + "\n" +
        "إلا بغيتي تبدل أولا تلغي: wa.me/" + BARBERSHOP.whatsapp + "\n\nنتسناوك! ✂️";
      break;
    default:
      msg = "مرحباً " + ctx.client_name + "، رسالة من Barbero Taiib.";
  }
  if (adminFirst) msg = "🍀 [رسالة آلية من Barbero Taiib]\n\n" + msg;
  return msg;
}

function openWhatsApp(order, templateKey) {
  var msg = buildMessage(templateKey, order, true);
  window.open("https://wa.me/" + order.client_phone.replace(/\D/g, "") + "?text=" + encodeURIComponent(msg), "_blank");
}
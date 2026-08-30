# Barbero Taiib — Automated WhatsApp Templates (Darija)

## 1. Booking Received

```
سلام {client_name} 👋 شكراً على رسالتك!

تيقنت طلب الحجز ديالك عندنا:
🚹 الخدمة: {service_type}
📅 التاريخ: {appointment_date}
⏰ الوقت: {appointment_time}

الطلب ديالك غادي يبقى "قيد الانتظار" (Pending) حتى يتأكد الصالون. غادي نرجعو ليك ب قرب قدر الإمكان. 🙏
```

Status set: `Pending`

---

## 2. Booking Confirmed

```
مزيان {client_name} 😊

الحجز ديالك تأكد بنجاح ✅
🚹 الخدمة: {service_type}
📅 التاريخ: {appointment_date}
⏰ الوقت: {appointment_time}

📌 الموقع ديالنا: https://maps.google.com/?q=35.17755,2.92598
📞 واتساب: wa.me/212602714889

نتسناوك! 🔥
```

Status set: `Confirmed`

---

## 3. Reminder (2 hours before appointment)

```
سلام {client_name} 👋 تذكير سريع!

الحجز ديالك قريب:
🚹 الخدمة: {service_type}
📅 التاريخ: {appointment_date}
⏰ الوقت: {appointment_time}

📌 الموقع: https://maps.google.com/?q=35.17755,2.92598

إلا بغيتي تبدل أولا تلغي، عيط لنا على: wa.me/212602714889
نتسناوك! ✂️
```

Status: no change (just a reminder)
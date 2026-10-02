const admin = require('firebase-admin');

// ตั้งค่า Firebase Admin SDK (ใช้ข้อมูลโปรเจกต์ของคุณ)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'sorawichtoday-adlink'
  });
}

module.exports = async (req, res) => {
  // รับค่ารหัสลิงก์ย่อ เช่น xxxx จาก URL
  const { code } = req.query;
  const userAgent = req.headers['user-agent'] || '';

  // เช็กว่าเป็น Social Media Bot/Crawler หรือไม่
  const isCrawler = /facebookexternalhit|line-poker|twitterbot|whatsapp|telegrambot|discordbot/i.test(userAgent);

  try {
    const db = admin.firestore();
    // ค้นหาข้อมูลลิงก์ย่อจาก Firestore
    const snapshot = await db.collection('artifacts')
      .doc('sorawichtoday-adlink')
      .collection('public')
      .doc('data')
      .collection('links')
      .where('code', '==', code)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // ถ้าหาไม่เจอ ให้ส่งเข้าหน้าเว็บหลัก
      return res.redirect(302, '/');
    }

    const linkData = snapshot.docs[0].data();

    if (isCrawler) {
      // ถ้าเป็น Bot ให้พ่นเฉพาะแท็ก Meta OpenGraph ให้ อ่าน
      const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${linkData.ogTitle || 'AdLink Pro'}</title>
    <meta property="og:title" content="${linkData.ogTitle || 'AdLink Pro'}">
    <meta property="og:description" content="${linkData.ogDesc || 'คลิกลิงก์เพื่อไปยังหน้าปลายทาง'}">
    <meta property="og:image" content="${linkData.ogImage || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://${req.headers.host}/${code}">
</head>
<body></body>
</html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } else {
      // ถ้าเป็นคนเปิดจริงๆ ให้ส่งเข้าหน้าแอปหลัก index.html
      return res.redirect(302, `/#${code}`);
    }
  } catch (error) {
    console.error('Error fetching link:', error);
    return res.redirect(302, '/');
  }
};

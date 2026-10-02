module.exports = async (req, res) => {
  const code = req.query.code || '';
  const userAgent = req.headers['user-agent'] || '';

  // เช็กว่าเป็น Social Media Bot หรือไม่
  const isCrawler = /facebookexternalhit|line-poker|twitterbot|whatsapp|telegrambot|discordbot/i.test(userAgent);

  if (!code) {
    return res.redirect(302, '/index.html');
  }

  try {
    // 1. ดึงข้อมูลจาก Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/sorawichtoday-adlink/databases/(default)/documents/artifacts/sorawichtoday-adlink/public/data/links`;
    const response = await fetch(firestoreUrl);
    const data = await response.json();

    let linkData = null;
    if (data.documents) {
      const matchedDoc = data.documents.find(doc => {
        const fields = doc.fields || {};
        const docCode = fields.code?.stringValue;
        return docCode === code;
      });

      if (matchedDoc) {
        const fields = matchedDoc.fields;
        linkData = {
          ogTitle: fields.ogTitle?.stringValue || 'AdLink Pro',
          ogDesc: fields.ogDesc?.stringValue || 'คลิกลิงก์เพื่อไปยังหน้าปลายทาง',
          ogImage: fields.ogImage?.stringValue || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
          originalUrl: fields.originalUrl?.stringValue || '/'
        };
      }
    }

    // 2. ถ้าเป็น Crawler ให้ส่ง HTML Response (200 OK) กลับไปทันที ห้าม Redirect!
    if (isCrawler) {
      const title = linkData ? linkData.ogTitle : 'AdLink Pro';
      const desc = linkData ? linkData.ogDesc : 'คลิกลิงก์เพื่อไปยังหน้าปลายทาง';
      const image = linkData ? linkData.ogImage : '';

      const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${image}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://${req.headers.host}/${code}">
</head>
<body></body>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    // 3. ถ้าเป็นคนเล่นเว็บจริง ส่งเข้าหน้า index.html
    return res.redirect(302, `/#${code}`);

  } catch (error) {
    console.error('Error in shortlink handler:', error);
    if (isCrawler) {
      return res.status(200).send('<!DOCTYPE html><html><head><title>AdLink Pro</title></head><body></body></html>');
    }
    return res.redirect(302, '/index.html');
  }
};

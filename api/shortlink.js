export default async function handler(req, res) {
  // รับค่ารหัสลิงก์สั้น เช่น xxxx
  let code = req.query.code;
  if (!code) {
    const urlParts = req.url.split('?')[0].split('/').filter(Boolean);
    code = urlParts[urlParts.length - 1];
  }

  if (!code || code === 'index.html' || code === 'favicon.ico') {
    return res.redirect(302, '/');
  }

  const projectId = 'sorawichtoday-adlink';
  const firestoreEndpoint = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`;

  try {
    // ดึงข้อมูลลิงก์ย่อจาก Firestore REST API โดยตรง
    const response = await fetch(firestoreEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'links' }],
          where: {
            fieldFilter: {
              field: { fieldPath: 'code' },
              op: 'EQUAL',
              value: { stringValue: code }
            }
          },
          limit: 1
        }
      })
    });

    const data = await response.json();
    let linkData = null;

    if (Array.isArray(data) && data[0] && data[0].document) {
      const fields = data[0].document.fields || {};
      linkData = {
        ogTitle: fields.ogTitle?.stringValue || 'AdLink Pro',
        ogDesc: fields.ogDesc?.stringValue || 'คลิกลิงก์เพื่อดูข้อมูลเพิ่มเติม',
        ogImage: fields.ogImage?.stringValue || 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
        originalUrl: fields.originalUrl?.stringValue || ''
      };
    }

    // ถ้าไม่พบรหัสลิงก์ย่อ ให้กลับสู่หน้าหลัก
    if (!linkData) {
      return res.redirect(302, '/');
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const canonicalUrl = `${protocol}://${host}/${code}`;

    // พ่นแท็ก OpenGraph ของเว็บไซต์ปลายทางจริงให้ Facebook / LINE / Twitter อ่าน
    const html = `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(linkData.ogTitle)}</title>
    
    <!-- OpenGraph Meta Tags -->
    <meta property="og:site_name" content="AdLink Pro">
    <meta property="og:title" content="${escapeHtml(linkData.ogTitle)}">
    <meta property="og:description" content="${escapeHtml(linkData.ogDesc)}">
    <meta property="og:image" content="${escapeHtml(linkData.ogImage)}">
    <meta property="og:image:secure_url" content="${escapeHtml(linkData.ogImage)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="${canonicalUrl}">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(linkData.ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(linkData.ogDesc)}">
    <meta name="twitter:image" content="${escapeHtml(linkData.ogImage)}">

    <!-- สคริปต์สลับผู้ใช้จริงเข้าสู่หน้าโฆษณา -->
    <script>
        window.location.replace("/#" + ${JSON.stringify(code)});
    </script>
</head>
<body style="background-color: #0f172a; color: #f8fafc; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0;">
    <div style="text-align: center;">
        <p>กำลังพาท่านไปยังลิงก์ปลายทาง...</p>
        <a href="/#${code}" style="color: #f97316;">คลิกที่นี่หากหน้าเว็บไม่สลับให้อัตโนมัติ</a>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (err) {
    console.error("Vercel OpenGraph Error:", err);
    return res.redirect(302, '/');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

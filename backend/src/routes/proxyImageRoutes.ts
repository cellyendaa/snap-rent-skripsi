import { Router, Request, Response } from 'express';

const router = Router();

/** Extract Google Drive file ID from view URL or return null */
function getDriveFileId(url: string): string | null {
  const trimmed = String(url || '').trim();
  const m = trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)
    || trimmed.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

/**
 * Proxy image from Google Drive so <img> can load it without CORS/referrer issues.
 * GET /api/proxy-image?id=DRIVE_FILE_ID
 * or
 * GET /api/proxy-image?url=ENCODED_DRIVE_VIEW_URL
 */
router.get('/proxy-image', async (req: Request, res: Response): Promise<void> => {
  try {
    let fileId: string | null = null;
    const idParam = req.query.id;
    const urlParam = req.query.url;
    if (typeof idParam === 'string' && idParam.trim()) {
      fileId = idParam.trim();
    } else if (typeof urlParam === 'string' && urlParam.trim()) {
      const decoded = decodeURIComponent(urlParam.trim());
      fileId = getDriveFileId(decoded);
    }
    if (!fileId) {
      res.status(400).json({ success: false, message: 'Missing id or url query' });
      return;
    }
    const driveUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;
    const proxyRes = await fetch(driveUrl, {
      method: 'GET',
      headers: { Referer: '' },
      redirect: 'follow',
    });
    if (!proxyRes.ok) {
      res.status(proxyRes.status).json({
        success: false,
        message: `Upstream returned ${proxyRes.status}`,
      });
      return;
    }
    const contentType = proxyRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    const buffer = await proxyRes.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error('Proxy image error:', err);
    res.status(502).json({ success: false, message: 'Proxy failed' });
  }
});

export default router;

// Debug: call the try-on and check backend console/logs for the exact error
const fs = require('fs');

async function test() {
  const out = [];
  const log = (msg) => { out.push(msg); };
  
  const bodyDir = 'c:\\Users\\hp\\Desktop\\wauderobe code\\backend\\uploads\\body\\originals';
  const bodyFiles = fs.readdirSync(bodyDir);
  const latestBody = bodyFiles[bodyFiles.length - 1];
  const bodyPhotoUrl = `/uploads/body/originals/${latestBody}`;
  
  // Check each item's garment file existence
  const wardRes = await fetch('http://localhost:3000/api/wardrobe?category=all');
  const wardData = await wardRes.json();
  const items = (wardData.data || []).filter(i => i.status === 'done' && i.processedUrl);
  
  const uploadsRoot = 'c:\\Users\\hp\\Desktop\\wauderobe code\\backend\\uploads';
  
  for (const item of items) {
    const procUrl = item.processedUrl;
    // resolve just like try-on.service does
    const prefix = '/uploads/';
    const idx = procUrl.indexOf(prefix);
    if (idx === -1) {
      log(`Item ${item.id}: URL doesn't start with /uploads/: ${procUrl}`);
      continue;
    }
    const rel = procUrl.slice(idx + prefix.length);
    const fullPath = `${uploadsRoot}\\${rel.replace(/\//g, '\\\\')}`;
    const exists = fs.existsSync(fullPath);
    log(`Item ${item.id} (${item.category}): ${procUrl} -> ${fullPath} | exists: ${exists}`);
  }
  
  log(`\nBody photo path: ${bodyPhotoUrl}`);
  const bodyRel = bodyPhotoUrl.slice('/uploads/'.length);
  const bodyFullPath = `${uploadsRoot}\\${bodyRel.replace(/\//g, '\\\\')}`;
  log(`Body full path: ${bodyFullPath} | exists: ${fs.existsSync(bodyFullPath)}`);
  
  // Also check the tryon/generated dir
  const genDir = `${uploadsRoot}\\tryon\\generated`;
  log(`\nGenerated dir exists: ${fs.existsSync(genDir)}`);
  
  // Now test the compose logic manually
  const sharp = require('sharp');
  
  try {
    let bodyBuf = fs.readFileSync(bodyFullPath);
    let meta = await sharp(bodyBuf).metadata();
    log(`\nBody image: ${meta.width}x${meta.height}, format: ${meta.format}, channels: ${meta.channels}`);
    
    // Resize the body to max 1200
    if (meta.width > 1200 || meta.height > 1200) {
      bodyBuf = await sharp(bodyBuf).resize({width: 1200, height: 1200, fit: 'inside'}).png().toBuffer();
      meta = await sharp(bodyBuf).metadata();
      log(`After resize: ${meta.width}x${meta.height}`);
    }
    
    const width = meta.width;
    const height = meta.height;
    
    // Body box (centered default since no alpha)
    const box = { left: 0.15, top: 0.05, width: 0.7, height: 0.9 };
    const pxBox = {
      left: Math.round(box.left * width),
      top: Math.round(box.top * height),
      width: Math.round(box.width * width),
      height: Math.round(box.height * height),
    };
    log(`Pixel box: L=${pxBox.left} T=${pxBox.top} W=${pxBox.width} H=${pxBox.height}`);
    
    // TOP region
    const topRegion = {
      left: Math.round(pxBox.left + pxBox.width * 0.04),
      top: Math.round(pxBox.top + pxBox.height * 0.06),
      width: Math.round(pxBox.width * 0.92),
      height: Math.round(pxBox.height * 0.38),
    };
    log(`Top region: L=${topRegion.left} T=${topRegion.top} W=${topRegion.width} H=${topRegion.height}`);
    
    // Test overlay
    let working = await sharp(bodyBuf).ensureAlpha().png().toBuffer();
    
    const topItem = items.find(i => i.category === 'tops');
    if (topItem) {
      const topPath = `${uploadsRoot}\\${topItem.processedUrl.slice('/uploads/'.length).replace(/\//g, '\\\\')}`;
      log(`Top garment path: ${topPath} | exists: ${fs.existsSync(topPath)}`);
      
      const garBuf = fs.readFileSync(topPath);
      const garMeta = await sharp(garBuf).metadata();
      log(`Top garment: ${garMeta.width}x${garMeta.height}, format: ${garMeta.format}`);
      
      const resized = await sharp(garBuf)
        .ensureAlpha()
        .resize({ width: topRegion.width, height: topRegion.height, fit: 'inside', background: {r:0,g:0,b:0,alpha:0} })
        .png()
        .toBuffer();
      
      const rMeta = await sharp(resized).metadata();
      log(`Resized: ${rMeta.width}x${rMeta.height}`);
      
      // Create centered canvas overlay
      const targetW = topRegion.width;
      const targetH = topRegion.height;
      const gw = rMeta.width;
      const gh = rMeta.height;
      const oLeft = Math.max(0, Math.round((targetW - gw) / 2));
      const oTop = Math.max(0, Math.round((targetH - gh) / 2));
      
      const canvasBuf = await sharp({
        create: { width: targetW, height: targetH, channels: 4, background: {r:0,g:0,b:0,alpha:0} }
      }).composite([{ input: resized, left: oLeft, top: oTop }]).png().toBuffer();
      
      log(`Canvas buffer: ${canvasBuf.length} bytes`);
      
      const composite = await sharp(working)
        .composite([{ input: canvasBuf, left: topRegion.left, top: topRegion.top }])
        .png()
        .toBuffer();
      
      fs.writeFileSync('C:/tmp/test-compose2.png', composite);
      log(`SUCCESS! Saved test-compose2.png, ${composite.length} bytes`);
    }
  } catch (e) {
    log(`ERROR: ${e.message}`);
    log(`Stack: ${e.stack?.substring(0, 500)}`);
  }
  
  fs.writeFileSync('C:/tmp/tryon-diag5.txt', out.join('\n'));
  console.log('Done. Check C:/tmp/tryon-diag5.txt');
}

test().catch(e => {
  console.error('Fatal:', e);
  fs.writeFileSync('C:/tmp/tryon-diag5.txt', 'FATAL: ' + e.message);
});

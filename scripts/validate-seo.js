
import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://127.0.0.1:5173'; // Default Vite Dev Server URL
const PUBLIC_DIR = path.join(__dirname, '../public');

console.log(`\n🔍 Starting SEO & Sitemap Validation...`);
console.log(`Target: ${BASE_URL}\n`);

async function validate() {
    let errors = 0;

    // 1. Check Local Files
    console.log('✅ Pillar 1: Local File Checks');

    // Check robots.txt
    const robotsPath = path.join(PUBLIC_DIR, 'robots.txt');
    if (fs.existsSync(robotsPath)) {
        console.log('  [PASS] robots.txt exists.');
        const robotsContent = fs.readFileSync(robotsPath, 'utf8');
        if (robotsContent.includes('Sitemap:')) {
            console.log('  [PASS] robots.txt contains Sitemap directive.');
        } else {
            console.error('  [FAIL] robots.txt missing Sitemap directive.');
            errors++;
        }
    } else {
        console.error('  [FAIL] robots.txt not found in public/.');
        errors++;
    }

    // Check sitemap.xml
    const sitemapPath = path.join(PUBLIC_DIR, 'sitemap.xml');
    if (fs.existsSync(sitemapPath)) {
        console.log('  [PASS] sitemap.xml exists.');
        const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
        if (sitemapContent.startsWith('<?xml')) {
            console.log('  [PASS] sitemap.xml has XML declaration.');
        } else {
            console.error('  [FAIL] sitemap.xml missing XML declaration.');
            errors++;
        }
    } else {
        console.error('  [FAIL] sitemap.xml not found in public/.');
        errors++;
    }

    // 2. Live Server Checks (Fetching)
    console.log('\n✅ Pillar 2: Live Server Checks');

    try {
        // Check Robots.txt availability
        const robotsRes = await fetchUrl(`${BASE_URL}/robots.txt`);
        if (robotsRes.status === 200) {
            console.log(`  [PASS] Fetch robots.txt (200 OK)`);
        } else {
            console.error(`  [FAIL] Fetch robots.txt status: ${robotsRes.status}`);
            errors++;
        }

        // Check Sitemap availability and Content-Type
        const sitemapRes = await fetchUrl(`${BASE_URL}/sitemap.xml`);
        if (sitemapRes.status === 200) {
            console.log(`  [PASS] Fetch sitemap.xml (200 OK)`);

            // Note: Vite dev server might set generic content-type, but we allow text/xml or application/xml
            const contentType = sitemapRes.headers['content-type'];
            if (contentType && (contentType.includes('xml'))) {
                console.log(`  [PASS] Sitemap Content-Type: ${contentType}`);
            } else {
                console.warn(`  [WARN] Sitemap Content-Type is '${contentType}' (Expected XML). This might be fine in Dev.`);
            }
        } else {
            console.error(`  [FAIL] Fetch sitemap.xml status: ${sitemapRes.status}`);
            errors++;
        }

    } catch (err) {
        console.error(`  [CRITICAL] Could not connect to dev server at ${BASE_URL}. Is 'npm run dev' running?`);
        console.error(`  Error: ${err.message}`);
        errors++;
    }

    console.log('\n--- Validation Summary ---');
    if (errors === 0) {
        console.log('🎉 SUCCESS: All basic SEO checks passed!');
    } else {
        console.log(`❌ FAILED: Found ${errors} errors.`);
        process.exit(1);
    }
}

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            const { statusCode } = res;
            const contentType = res.headers['content-type'];

            let rawData = '';
            res.setEncoding('utf8');
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
                resolve({ status: statusCode, headers: res.headers, body: rawData });
            });
        }).on('error', (e) => {
            reject(e);
        });
    });
}

validate();

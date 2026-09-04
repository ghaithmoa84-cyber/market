/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');
const fs = require('fs');

const cookie = fs.readFileSync('cookies.txt', 'utf8')
  .split('\n')
  .filter(line => line.includes('authjs.session-token'))
  .map(line => {
    const parts = line.split('\t');
    return parts[5] + '=' + parts[6];
  })
  .join('; ');

console.log('Cookie:', cookie ? 'present' : 'missing');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/customer/products/cmtjy4fe100021258p0b7vb2w',
  method: 'GET',
  headers: {
    'Cookie': cookie
  }
};

let passed = true;
const checks = [
  { label: 'أرز بسمتي', match: 'أرز بسمتي' },
  { label: 'متجر التجريب', match: 'متجر التجريب' },
  { label: 'آخر تحديث', match: 'آخر تحديث' },
  { label: '120', match: '120' },
  { label: 'مفتوح', match: 'مفتوح' },
  { label: 'مغلق', match: 'مغلق' },
];

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode !== 200) passed = false;
    checks.forEach(({ label, match }) => {
      const found = data.includes(match);
      console.log(`Has ${label}:`, found);
      if (!found) passed = false;
    });
    if (!passed) process.exitCode = 1;
  });
});

req.setTimeout(10000, () => {
  console.error('Error: request timed out');
  req.destroy();
  process.exitCode = 1;
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exitCode = 1;
});

req.end();

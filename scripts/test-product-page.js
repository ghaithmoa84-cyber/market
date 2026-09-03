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

console.log('Cookie string:', cookie.substring(0, 100) + '...');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/customer/products/cmtjy4fe100021258p0b7vb2w',
  method: 'GET',
  headers: {
    'Cookie': cookie
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Has أرز بسمتي:', data.includes('أرز بسمتي'));
    console.log('Has متجر التجربة:', data.includes('متجر التجربة'));
    console.log('Has آخر تحديث:', data.includes('آخر تحديث'));
    console.log('Has 120:', data.includes('120'));
    console.log('Has مفتوح:', data.includes('مفتوح'));
    console.log('Has مغلق:', data.includes('مغلق'));
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.end();

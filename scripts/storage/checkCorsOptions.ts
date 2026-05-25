async function run() {
  const targetUrl = 'https://pub-ffc4b0692ab74fabb58cbccc5287d7b1.r2.dev/photox/public/fdc1f901701b952e0e80dfe12b066ad4.webp';
  const response = await fetch(targetUrl, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:32767',
      'Access-Control-Request-Method': 'GET',
    }
  });
  console.log(`Status: ${response.status}`);
  console.log('Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
}
run();

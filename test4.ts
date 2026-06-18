async function testFetch() {
  const rs = await fetch('http://localhost:3000/api/public/settings');
  console.log(rs.status);
  const text = await rs.text();
  console.log(text.substring(0, 1000));
}
testFetch().catch(console.error);

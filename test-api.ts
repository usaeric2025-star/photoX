async function testPhotosList() {
  const url = 'http://localhost:3000/api/categories';
  console.log(`Sending GET to ${url}...`);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body length:", text.length);
    console.log("Body preview:", text.substring(0, 1000));
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

testPhotosList();

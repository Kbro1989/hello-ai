export async function testAI() {
  try {
    const res = await fetch('/api/test');
    const data = await res.json();
    console.log('AI Test Response:', data);
  } catch (err) {
    console.error('AI Test Error:', err);
  }
}
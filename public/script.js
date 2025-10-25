document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  const params = new URLSearchParams(window.location.search);
  const event = params.get('event') || 'default';
  const token = params.get('token') || 'DEV';

  const message = document.getElementById('message');
  message.textContent = '⏳ Nahrávam...';

  try {
    const res = await fetch(`/upload?event=${event}&token=${token}`, {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      message.textContent = '✅ Hotovo, ďakujeme!';
    } else {
      message.textContent = '❌ Chyba pri nahrávaní.';
    }
  } catch (err) {
    message.textContent = '❌ Chyba: ' + err.message;
  }
});

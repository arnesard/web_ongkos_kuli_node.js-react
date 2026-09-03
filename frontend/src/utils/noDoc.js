// Samain dengan base64_encode()/base64_decode() Laravel buat segmen URL {no_doc}
// di route transaksi-bs / transaksi-lpbs. no_doc bisa mengandung karakter "/"
// (contoh: "BS001/09/2026"), makanya di-base64 dulu supaya aman ditaruh di path URL,
// lalu di-encodeURIComponent lagi buat jaga-jaga karakter +, /, = hasil base64.

export function encodeNoDoc(noDoc) {
  const base64 = btoa(unescape(encodeURIComponent(String(noDoc))));
  return encodeURIComponent(base64);
}

export function decodeNoDoc(encoded) {
  const base64 = decodeURIComponent(encoded);
  return decodeURIComponent(escape(atob(base64)));
}

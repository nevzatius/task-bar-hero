// Easy Save 3 (ES3) decryption, ported from the verified PowerShell proof-of-concept.
//
// Scheme (confirmed against a real SaveFile_Live.es3): AES-128-CBC, PKCS7 padding.
// - salt = the file's first 16 bytes, and doubles as the AES IV.
// - key  = PBKDF2-HMAC-SHA1(password, salt, iterations: 100, 16 bytes).
// - ciphertext = everything after the first 16 bytes.
//
// The password below was extracted from the game's own `ES3Defaults` asset
// (TaskBarHero_Data/resources.assets), stored right next to the literal
// "SaveFile_Live.es3" string. If a future game update rotates it, decryption
// will fail with a clear error rather than producing garbage — see
// decryptSaveFile()'s catch path.
const ES3_PASSWORD = "emuMqG3bLYJ938ZDCfieWJ";
const PBKDF2_ITERATIONS = 100;
const KEY_LENGTH_BITS = 128;

/**
 * Decrypts a raw SaveFile_Live.es3 ArrayBuffer and returns the parsed,
 * fully-nested JSON object (with PlayerSaveData already parsed from its
 * inner JSON string).
 */
export async function decryptSaveFile(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  if (bytes.length <= 16) {
    throw new Error("Dosya çok küçük görünüyor, geçerli bir SaveFile_Live.es3 değil.");
  }

  const salt = bytes.slice(0, 16);
  const ciphertext = bytes.slice(16);

  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(ES3_PASSWORD),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const aesKey = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-1",
    },
    passwordKey,
    { name: "AES-CBC", length: KEY_LENGTH_BITS },
    false,
    ["decrypt"]
  );

  let plainBuffer;
  try {
    plainBuffer = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv: salt },
      aesKey,
      ciphertext
    );
  } catch (err) {
    throw new Error(
      "Şifre çözme başarısız oldu. Oyun bir güncelleme ile şifreleme anahtarını değiştirmiş olabilir; " +
        "bu durumda bu aracın güncellenmesi gerekir."
    );
  }

  const text = new TextDecoder("utf-8").decode(plainBuffer);

  let outer;
  try {
    outer = JSON.parse(text);
  } catch (err) {
    throw new Error("Şifre çözüldü ama içerik geçerli JSON değil. Dosya bozuk olabilir.");
  }

  // PlayerSaveData (and similarly AccountSaveData) come back as ES3's
  // {"__type": "string", "value": "<json>"} wrapper containing a second,
  // nested JSON string that needs its own parse pass.
  if (outer.PlayerSaveData && typeof outer.PlayerSaveData.value === "string") {
    try {
      outer.PlayerSaveData = JSON.parse(outer.PlayerSaveData.value);
    } catch (err) {
      throw new Error("PlayerSaveData içeriği çözümlenemedi.");
    }
  }

  return outer;
}

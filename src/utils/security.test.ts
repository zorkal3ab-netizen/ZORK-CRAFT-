import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAuthorizedOwnerEmail,
  validateNewPassword,
  generateOtpCode,
  hashOtpCode,
  hashIp,
  isAllowedFilename,
  sanitizeFilename,
  validateExternalUrl,
  OFFICIAL_OWNER_EMAIL,
} from './security';

test('Owner email authorization strictly allows only zorkal3ab@gmail.com', () => {
  assert.equal(isAuthorizedOwnerEmail(OFFICIAL_OWNER_EMAIL), true);
  assert.equal(isAuthorizedOwnerEmail('  zorkal3ab@gmail.com  '), true);
  assert.equal(isAuthorizedOwnerEmail('ZORKAL3AB@GMAIL.COM'), true);
  
  // Unauthorized emails
  assert.equal(isAuthorizedOwnerEmail('admin@zorkcraft.com'), false);
  assert.equal(isAuthorizedOwnerEmail('hacker@gmail.com'), false);
  assert.equal(isAuthorizedOwnerEmail(''), false);
});

test('Password strength validation rejects weak passwords and default zork2026', () => {
  // Reject default temporary password
  const defCheck = validateNewPassword('zork2026');
  assert.equal(defCheck.valid, false);

  // Reject short password
  const shortCheck = validateNewPassword('12345');
  assert.equal(shortCheck.valid, false);

  // Reject letters only
  const letterCheck = validateNewPassword('abcdefghijk');
  assert.equal(letterCheck.valid, false);

  // Valid strong passwords
  const validCheck1 = validateNewPassword('ZorkBedrock2026!');
  assert.equal(validCheck1.valid, true);

  const validCheck2 = validateNewPassword('CraftOwner#992');
  assert.equal(validCheck2.valid, true);
});

test('OTP code generation produces 6-digit numeric string', () => {
  const code = generateOtpCode();
  assert.equal(code.length, 6);
  assert.match(code, /^[0-9]{6}$/);

  const hash1 = hashOtpCode(code);
  const hash2 = hashOtpCode(code);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, code);
});

test('IP hashing produces consistent anonymized string', () => {
  const h1 = hashIp('192.168.1.1');
  const h2 = hashIp('192.168.1.1');
  const h3 = hashIp('192.168.1.2');
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});

test('Minecraft file validation accepts valid bedrock formats and rejects dangerous extensions', () => {
  assert.equal(isAllowedFilename('world.mcworld'), true);
  assert.equal(isAllowedFilename('addon.mcaddon'), true);
  assert.equal(isAllowedFilename('pack.mcpack'), true);
  assert.equal(isAllowedFilename('archive.zip'), true);
  assert.equal(isAllowedFilename('cover.png'), true);
  assert.equal(isAllowedFilename('screenshot.webp'), true);

  // Reject dangerous extensions
  assert.equal(isAllowedFilename('malware.exe'), false);
  assert.equal(isAllowedFilename('script.sh'), false);
  assert.equal(isAllowedFilename('exploit.php'), false);
  assert.equal(isAllowedFilename('hack.js'), false);
});

test('Android file validation detects MIME types when extension is absent', () => {
  assert.equal(isAllowedFilename('image_picker_3821', 'image/jpeg'), true);
  assert.equal(isAllowedFilename('Screenshot_2026', 'image/png'), true);
  assert.equal(isAllowedFilename('bedrock_pack', 'application/zip'), true);
  assert.equal(isAllowedFilename('dangerous_script', 'application/x-sh'), false);
});

test('MediaFire and external URL validation verifies HTTPS and rejects malicious schemes', () => {
  // Valid MediaFire URL
  const mfResult = validateExternalUrl('https://www.mediafire.com/file/abcdef12345/zork_addon.mcaddon/file');
  assert.equal(mfResult.valid, true);
  assert.equal(mfResult.isMediaFire, true);

  // Valid external download link
  const extResult = validateExternalUrl('https://drive.google.com/uc?id=12345');
  assert.equal(extResult.valid, true);
  assert.equal(extResult.isMediaFire, false);

  // Reject javascript scheme
  assert.equal(validateExternalUrl('javascript:alert(1)').valid, false);

  // Reject local IP SSRF attempt
  assert.equal(validateExternalUrl('http://127.0.0.1:8080/exploit').valid, false);
  assert.equal(validateExternalUrl('http://localhost:3000/api/admin').valid, false);
});


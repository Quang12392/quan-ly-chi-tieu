import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { fixture } from './storage.mjs';

// Kiểm tra PIN trên Apps Script: không có PIN trong mã, phiên ký HMAC, khóa khi nhập sai.
const f = fixture([]);
f.context.Utilities.computeHmacSha256Signature = (value, key) => crypto.createHmac('sha256', key).update(value).digest();
const post = (body) => JSON.parse(f.context.doPost({ postData: { contents: JSON.stringify(body) } }));

let r = post({ action: 'getBootstrapData' });
assert.equal(r.ok, false); assert.equal(r.error.code, 'AUTH_REQUIRED');
assert.equal(post({ action: 'login', payload: { pin: '123456', member_id: 'wife' } }).error.code, 'AUTH_NOT_CONFIGURED', 'No PIN works until the owner sets FAMILY_PIN');

f.props.set('FAMILY_PIN', '246810');
r = post({ action: 'login', payload: { pin: '000000', member_id: 'wife' } });
assert.equal(r.error.code, 'AUTH_BAD_PIN');
assert.equal(f.props.has('FAMILY_PIN'), false, 'Plain PIN is removed after hashing');
assert.ok(f.props.get('auth_pin_hash') && !f.props.get('auth_pin_hash').includes('246810'));

r = post({ action: 'login', payload: { pin: '246810', member_id: 'wife' } });
assert.equal(r.ok, true); const token = r.data.token;
assert.equal(post({ action: 'getBootstrapData', token }).ok, true);
assert.equal(post({ action: 'getBootstrapData' }).error.code, 'AUTH_REQUIRED');
assert.equal(post({ action: 'getBootstrapData', token: token.replace('wife', 'husband') }).error.code, 'AUTH_REQUIRED', 'Tampered member is rejected');
assert.equal(post({ action: 'login', payload: { pin: '246810', member_id: 'admin' } }).error.code, 'AUTH_BAD_REQUEST');

// Đổi PIN: phiên cũ của máy kia hết hiệu lực, máy đổi nhận phiên mới.
const other = post({ action: 'login', payload: { pin: '246810', member_id: 'husband' } }).data.token;
assert.equal(post({ action: 'changePin', token, payload: { old_pin: '111111', new_pin: '13579a' } }).error.code, 'AUTH_BAD_PIN');
r = post({ action: 'changePin', token, payload: { old_pin: '246810', new_pin: '13579a' } });
assert.equal(r.ok, true);
assert.equal(post({ action: 'ping', token: r.data.token }).ok, true);
assert.equal(post({ action: 'ping', token: other }).error.code, 'AUTH_REQUIRED');

// 5 lần sai => khóa, kể cả PIN đúng.
for (let i = 0; i < 5; i++) assert.equal(post({ action: 'login', payload: { pin: 'wrong' + i, member_id: 'husband' } }).error.code, 'AUTH_BAD_PIN');
assert.equal(post({ action: 'login', payload: { pin: '13579a', member_id: 'husband' } }).error.code, 'AUTH_LOCKED');

// Quên PIN: đặt lại FAMILY_PIN mở khóa và vô hiệu mọi phiên.
f.props.set('FAMILY_PIN', '864200');
assert.equal(post({ action: 'login', payload: { pin: '864200', member_id: 'husband' } }).ok, true);
assert.equal(post({ action: 'ping', token: r.data.token }).error.code, 'AUTH_REQUIRED');
console.log('Auth passed: server-side PIN hash, signed sessions, change/reset PIN, lockout.');

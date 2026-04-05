const BV_TABLE = 'FcwAPNKTMug3GV5Lj7EJnHpWsxYeviqBz6rkCy12mUSDQX9RdoZf';
const BV_MAP = {};
for (let i = 0; i < BV_TABLE.length; i++) { BV_MAP[BV_TABLE[i]] = BigInt(i); }
const bvid = 'BV1GJ411x7h7';
const chars = bvid.split('');
let tmp = chars[3]; chars[3] = chars[9]; chars[9] = tmp;
tmp = chars[4]; chars[4] = chars[7]; chars[7] = tmp;
for (let i = 3; i < 12; i++) {
    console.log(chars[i], BV_MAP[chars[i]]);
}

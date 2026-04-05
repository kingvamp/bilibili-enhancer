const table = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf';
const tr = {};
for (let i = 0; i < 58; i++) {
    tr[table[i]] = BigInt(i);
}
const x = 'BV1GJ411x7h7';
const s = [11, 10, 3, 8, 4, 6];
let r = 0n;
for (let i = 0; i < 6; i++) {
    r += tr[x[s[i]]] * (58n ** BigInt(i));
}
console.log(((r - 8728348608n) ^ 177451812n).toString());

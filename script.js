const ranges = {
    germany: "185.53.",
    uae: "94.200.",
    usa: "23.45.",
    turkey: "176.40.",
    iran: "5.120.",
    finland: "82.130."
};

function randIP(base) {
    return base + Math.floor(Math.random()*255) + "." + Math.floor(Math.random()*255);
}

function randKey() {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let key = "";
    for (let i=0; i<44; i++) key += chars[Math.floor(Math.random()*chars.length)];
    return key;
}

function generate() {
    let c = document.getElementById("country").value;
    let days = document.getElementById("days").value;
    let users = document.getElementById("users").value;
    let limit = document.getElementById("limit").value;
    let pack = document.getElementById("pack").value;

    let ipv4 = randIP(ranges[c]);
    let priv = randKey();
    let pub = randKey();

    let out =
`# WireGuard Config
# Pack: ${pack}
# Days: ${days}
# Users: ${users}
# Limit: ${limit}GB
# Country: ${c.toUpperCase()}

[Interface]
PrivateKey = ${priv}
Address = 10.10.0.${Math.floor(Math.random()*200)}/24
DNS = 1.1.1.1

[Peer]
PublicKey = ${pub}
Endpoint = ${ipv4}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25`;

    document.getElementById("result").value = out;
}
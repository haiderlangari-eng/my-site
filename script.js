/* script.js */
/*
  Notes:
  - This uses sample CIDR prefix lists for each country.
  - Replace or expand "cidrLists" with authoritative country CIDR lists (IP2Location / RIR / BGPView).
  - Each IPv6 generation uses the chosen prefix and appends random hex groups to form two /64 addresses.
*/

(function(){
  // --- Sample CIDR lists (S M A L L — replace with official lists for production) ---
  const cidrLists = {
    germany: {
      ipv4: [
        "85.10.0.0/16",   // example ranges (sample)
        "79.0.0.0/8",
        "188.0.0.0/8"
      ],
      ipv6: [
        "2a00:0::/32",
        "2a01:4f8::/32"
      ]
    },
    uae: {
      ipv4: [
        "94.200.0.0/16",
        "41.32.0.0/14"
      ],
      ipv6: [
        "2a05:6c80::/32",
        "2a02:1f80::/32"
      ]
    },
    usa: {
      ipv4: [
        "3.0.0.0/8",
        "8.8.8.0/24",
        "44.192.0.0/10"
      ],
      ipv6: [
        "2600::/12",
        "2406:da00::/32"
      ]
    },
    turkya: {
      ipv4: [
        "88.232.0.0/14",
        "78.188.0.0/15"
      ],
      ipv6: [
        "2a01:7e00::/32",
        "2a05:9000::/32"
      ]
    },
    iran: {
      ipv4: [
        "5.51.0.0/16",
        "185.27.0.0/16"
      ],
      ipv6: [
        "2a02:2f80::/32"
      ]
    },
    finland: {
      ipv4: [
        "193.10.0.0/16",
        "37.205.0.0/16"
      ],
      ipv6: [
        "2a02:6b80::/32",
        "2a03:2880::/32"
      ]
    }
  };

  // --- utility functions ---
  function cidrToRange(cidr){
    // returns {networkInt, maskLen} for IPv4
    const [ip, mask] = cidr.split('/');
    const maskLen = parseInt(mask,10);
    const parts = ip.split('.').map(n=>parseInt(n,10));
    let net = 0;
    for(let i=0;i<4;i++){ net = (net<<8) + (parts[i] || 0); }
    return {network: net >>> 0, maskLen};
  }

  function randomIntBetween(a,b){
    return Math.floor(Math.random()*(b-a+1))+a;
  }

  function intToIPv4(i){
    return [(i>>>24)&255, (i>>>16)&255, (i>>>8)&255, i&255].join('.');
  }

  function randomFromCIDR(cidr){
    // generate a random IPv4 inside given cidr
    const {network, maskLen} = cidrToRange(cidr);
    const hostBits = 32 - maskLen;
    if(hostBits <= 0) return intToIPv4(network);
    const maxHost = (1<<Math.min(hostBits,31)) - 1;
    // if hostBits > 31, produce several random parts
    let offset;
    if(hostBits <= 31){
      offset = randomIntBetween(0, maxHost);
      return intToIPv4((network & (~maxHost)) + offset);
    } else {
      // extremely large block (rare in sample) - generate within some subrange
      offset = randomIntBetween(0, 0x7fffffff);
      return intToIPv4((network + offset) >>> 0);
    }
  }

  function randomHex(len){
    let s='';
    for(let i=0;i<len;i++) s += Math.floor(Math.random()*16).toString(16);
    return s;
  }

  function normalizeIPv6Prefix(prefix){
    // accepts forms like 2a00::/32
    const [p,mask] = prefix.split('/');
    return {prefix:p,maskLen: parseInt(mask||64,10)};
  }

  function generateIPv6FromPrefix(prefix){
    // produce a full IPv6 address in the prefix, produce a /64 address
    const {prefix:p, maskLen} = normalizeIPv6Prefix(prefix);
    // We'll assume maskLen <= 64. We'll fill remaining hextets after the prefix's known groups.
    // Expand prefix into hextets:
    let base = p;
    // remove trailing :: and count
    const parts = base.split(':');
    // Quick approach: produce address as prefix (without /) + random hex groups to reach 8 groups
    let groups = [];
    for(const part of parts){
      if(part==='') groups.push(''); else groups.push(part);
    }
    // Count empty (for ::)
    // We'll produce string by taking the explicit prefix text (without trailing ::) and append random groups to reach 8 hextets
    // Simpler: return prefix + (random hex blocks)
    const needed = 8 - (parts.filter(x=>x!=='').length);
    // Construct random tail of needed hextets
    let tail = [];
    for(let i=0;i< (8 - parts.filter(x=>x!=='').length); i++){
      tail.push(randomIntBetween(0,0xffff).toString(16));
    }
    // Build an address by replacing :: with tail
    let addr = base.includes('::') ? base.replace('::', ':'+tail.join(':')) : (base + (tail.length?':'+tail.join(':'):''));
    // Ensure 8 groups (if still not, pad random)
    const groupsNow = addr.split(':').filter(g=>g!=='' && g!==undefined);
    while(groupsNow.length < 8){
      groupsNow.push(randomIntBetween(0,0xffff).toString(16));
    }
    const final = groupsNow.slice(0,8).map(g=>g.padStart(1,'0')).join(':');
    return final;
  }

  // --- DOM & Events ---
  const $country = document.getElementById('country');
  const $generate = document.getElementById('generate');
  const $result = document.getElementById('resultArea');
  const $serviceBtns = document.querySelectorAll('.service-btn');
  const $days = document.getElementById('days');
  const $users = document.getElementById('users');
  const $dataLimit = document.getElementById('dataLimit');
  const $pack = document.getElementById('pack');
  const $copyAll = document.getElementById('copyAll');
  const $reset = document.getElementById('reset');

  let selectedService = null;
  $serviceBtns.forEach(btn=>{
    btn.addEventListener('click', ()=>{
      $serviceBtns.forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      selectedService = btn.dataset.service;
    });
  });

  function showResult(obj){
    const html = `
      <div class="result-meta">
        <strong>Country:</strong> ${obj.country} · <strong>Service:</strong> ${obj.service} · <strong>Pack:</strong> ${obj.pack}
      </div>
      <pre>
IPv4: ${obj.ipv4}

IPv6 #1: ${obj.ipv6_1}
IPv6 #2: ${obj.ipv6_2}

Days: ${obj.days}
Users: ${obj.users}
Data Limit (GB): ${obj.dataLimit}

<!-- Configuration (example) -->
[Client]
Address = ${obj.ipv4}
IPv6 = ${obj.ipv6_1}, ${obj.ipv6_2}
Pack = ${obj.pack}
Service = ${obj.service}
      </pre>
    `;
    $result.classList.remove('empty');
    $result.innerHTML = html;
  }

  $generate.addEventListener('click', ()=>{
    const countryKey = $country.value;
    const countryPretty = $country.options[$country.selectedIndex].text;
    const list = cidrLists[countryKey];
    if(!list){
      $result.innerHTML = '<p class="muted">No CIDR list for chosen country.</p>';
      return;
    }
    // require a service selection — if none, choose from pack as fallback
    const service = selectedService || $pack.value || 'BRONZE';

    // pick random cidr
    const v4cidr = list.ipv4[Math.floor(Math.random()*list.ipv4.length)];
    const v6cidr = list.ipv6[Math.floor(Math.random()*list.ipv6.length)];

    const ipv4 = randomFromCIDR(v4cidr);
    const ipv6_1 = generateIPv6FromPrefix(v6cidr);
    const ipv6_2 = generateIPv6FromPrefix(v6cidr); // from same prefix

    const payload = {
      country: countryPretty,
      service,
      pack: $pack.value,
      days: $days.value,
      users: $users.value,
      dataLimit: $dataLimit.value,
      ipv4,
      ipv6_1,
      ipv6_2
    };
    showResult(payload);
  });

  $copyAll.addEventListener('click', ()=>{
    const text = document.getElementById('resultArea').innerText || '';
    if(!text) return alert('Nothing to copy.');
    navigator.clipboard?.writeText(text).then(()=>{ alert('Copied to clipboard'); }).catch(()=>{ alert('Copy failed — select & copy manually.'); });
  });

  $reset.addEventListener('click', ()=>{
    $country.value = 'germany';
    $days.value = 30;
    $users.value = 1;
    $dataLimit.value = 10;
    $pack.value = 'VIP';
    $serviceBtns.forEach(b=>b.classList.remove('active'));
    selectedService = null;
    $result.classList.add('empty');
    $result.innerHTML = '<p>No result yet. Choose a country and a service, then click <strong>Generate IPs</strong>.</p>';
  });

  // Wire sources links (informational)
  document.getElementById('source1').href = 'https://lite.ip2location.com/';
  document.getElementById('source2').href = 'https://bgpview.io/';

})();
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

interface Proxy {
  ip: string;
  port: string;
  protocols: string[];
  speed: number;
  latency: number;
  working?: boolean;
}

let proxyList: Proxy[] = [];
let failingCount = 0;

async function fetchProxyList() {
  const res = await fetch('https://proxylist.geonode.com/api/proxy-list?page=1&limit=500&sort_by=latency&sort_type=asc');
  const json: any = await res.json();
  proxyList = json.data || [];
  proxyList.sort((a: Proxy, b: Proxy) => {
    const scoreA = a.speed / Math.max(a.latency, 0.1);
    const scoreB = b.speed / Math.max(b.latency, 0.1);
    return scoreB - scoreA;
  });
  failingCount = 0;
}

export default async function proxyFetch(url: any, init?: any): Promise<any> {
  if (proxyList.length === 0) {
    await fetchProxyList();
  }

  while (true) {
    if (failingCount >= proxyList.length || proxyList.length === 0) {
      await fetchProxyList();
      if (proxyList.length === 0) {
        throw new Error("No proxies available");
      }
    }

    const proxy = proxyList[0];
    if (!proxy) throw new Error("No proxies available");
    let isValid = proxy.working;
    let agent: any;
    const protocol = proxy.protocols[0] || 'http';
    const proxyUrl = protocol.startsWith('socks') ? `${protocol}://${proxy.ip}:${proxy.port}` : `http://${proxy.ip}:${proxy.port}`;

    if (protocol.startsWith('socks')) {
      agent = new SocksProxyAgent(proxyUrl);
    } else {
      agent = new HttpsProxyAgent(proxyUrl);
    }

    if (!isValid) {
      try {
        const ipRes = await fetch('https://ip.me', { agent, signal: AbortSignal.timeout(5000) } as any);
        const ipText = await ipRes.text();
        if (ipText.includes(proxy.ip)) {
          const googleRes = await fetch('https://google.com', { agent, signal: AbortSignal.timeout(5000) } as any);
          if (googleRes.status === 200) {
            isValid = true;
            proxy.working = true;
          }
        }
      } catch (e) {}
    }

    if (isValid) {
      failingCount = 0;
      try {
        return await fetch(url, { ...init, agent } as any);
      } catch (e) {
        proxy.working = false;
        proxyList.shift();
        proxyList.push(proxy);
        failingCount++;
      }
    } else {
      proxy.working = false;
      proxyList.shift();
      proxyList.push(proxy);
      failingCount++;
    }
  }
}

/**
 * Extract the real client IP address from a request
 * Handles various proxy configurations and header formats
 */
const getClientIP = (req) => {
  let ip = null;

  // X-Forwarded-For can contain multiple IPs: "client, proxy1, proxy2"
  // The first one is the original client IP
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    ip = ips[0];
  }
  
  // X-Real-IP is set by some proxies (like Nginx)
  if (!ip) {
    const realIP = req.headers['x-real-ip'];
    if (realIP) {
      ip = realIP;
    }
  }
  
  // CF-Connecting-IP is set by Cloudflare
  if (!ip) {
    const cfIP = req.headers['cf-connecting-ip'];
    if (cfIP) {
      ip = cfIP;
    }
  }
  
  // req.ip uses trust proxy setting
  if (!ip && req.ip) {
    ip = req.ip;
  }
  
  // Fallback to connection/socket addresses
  if (!ip) {
    ip = req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.connection?.socket?.remoteAddress;
  }

  if (!ip) {
    return 'Unknown';
  }

  // Clean up the IP address
  // Remove IPv6 prefix (::ffff:) for IPv4-mapped IPv6 addresses
  ip = ip.replace(/^::ffff:/, '');
  
  // Convert IPv6 localhost to IPv4 localhost for readability
  if (ip === '::1') {
    ip = '127.0.0.1';
  }

  return ip;
};

export default getClientIP;

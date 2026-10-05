export function sessionIsExpired(expiresAt,now=Date.now()){
 const expiry=Date.parse(expiresAt||'');
 return !Number.isFinite(expiry)||expiry<=now;
}
export function sessionExpiryDelay(expiresAt,now=Date.now()){
 const expiry=Date.parse(expiresAt||'');
 return Number.isFinite(expiry)?Math.max(0,Math.min(2147483647,expiry-now)):0;
}
export function shouldLockSession(status){return status===401;}

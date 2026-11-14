import crypto from "node:crypto";
const COOKIE="kivo_admin";
const configured=()=>Boolean(process.env.SESSION_SECRET?.length>=32 && process.env.ADMIN_PASSWORD?.length>=12);
const sign=s=>crypto.createHmac("sha256",process.env.SESSION_SECRET).update(s).digest("base64url");
const equal=(a,b)=>{const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&crypto.timingSafeEqual(x,y)};
export function authConfigured(){return configured()}
export function verifyAdminPassword(value){
 if(!configured()||typeof value!=="string")return false;
 const a=crypto.scryptSync(value,process.env.SESSION_SECRET,64),b=crypto.scryptSync(process.env.ADMIN_PASSWORD,process.env.SESSION_SECRET,64);
 return crypto.timingSafeEqual(a,b);
}
export function createAdminToken(){
 const p=Buffer.from(JSON.stringify({role:"admin",exp:Math.floor(Date.now()/1000)+43200,jti:crypto.randomBytes(16).toString("hex")})).toString("base64url");
 return p+"."+sign(p);
}
export function readAdminCookie(req){
 const item=(req.headers.cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="));
 return item?decodeURIComponent(item.slice(COOKIE.length+1)):"";
}
export function isValidAdminToken(token){
 if(!configured()||typeof token!=="string")return false;
 const [p,s,...rest]=token.split(".");
 if(!p||!s||rest.length||!equal(s,sign(p)))return false;
 try{const d=JSON.parse(Buffer.from(p,"base64url").toString());return d.role==="admin"&&d.exp>Math.floor(Date.now()/1000)}catch{return false}
}
export function setAdminCookie(res,token){
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 res.setHeader("Set-Cookie",COOKIE+"="+encodeURIComponent(token)+"; HttpOnly; Path=/; SameSite=Strict; Max-Age=43200"+secure);
}
export function clearAdminCookie(res){
 const secure=process.env.NODE_ENV==="production"?"; Secure":"";
 res.setHeader("Set-Cookie",COOKIE+"=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0"+secure);
}
export function requireAdmin(req,res,next){
 if(!configured())return res.status(503).json({error:"Set SESSION_SECRET and ADMIN_PASSWORD in environment variables."});
 if(!isValidAdminToken(readAdminCookie(req)))return res.status(401).json({error:"Authentication required."});
 next();
}
const MAX_BINARY_BYTES=4*1024*1024,MAX_SECTIONS=96,MAX_IMPORTS=128,MAX_STRINGS=160;
function fail(m){throw new Error(m)}
function u16(b,o){if(o<0||o+2>b.length)fail("pe_truncated");return b.readUInt16LE(o)}
function u32(b,o){if(o<0||o+4>b.length)fail("pe_truncated");return b.readUInt32LE(o)}
function ascii(b,s,e,max=512){let v="";for(let i=s;i<Math.min(e,s+max)&&b[i]!==0;i++){if(b[i]<32||b[i]>126)return "";v+=String.fromCharCode(b[i])}return v}
export function inspectPortableExecutable(b){
if(!Buffer.isBuffer(b)||b.length<256||b.length>MAX_BINARY_BYTES)fail("binary_size_invalid");if(b.toString("ascii",0,2)!=="MZ")fail("not_pe");
const pe=u32(b,0x3c);if(pe<0x40||pe+24>b.length||b.toString("ascii",pe,pe+4)!=="PE\\0\\0")fail("invalid_pe_header");
const c=pe+4,m=u16(b,c),nsec=u16(b,c+2),stamp=u32(b,c+4),os=u16(b,c+16),o=c+20;if(nsec<1||nsec>MAX_SECTIONS||o+os>b.length)fail("pe_truncated");
const magic=u16(b,o);if(magic!==0x20b&&magic!==0x10b)fail("optional_header_invalid");const is64=magic===0x20b,dc=o+(is64?108:92),dd=o+(is64?112:96),nd=u32(b,dc),so=o+os,sections=[];
for(let i=0;i<nsec;i++){const x=so+i*40;if(x+40>b.length)fail("section_table_truncated");const name=ascii(b,x,x+8,8)||"unnamed",virtualSize=u32(b,x+8),virtualAddress=u32(b,x+12),rawSize=u32(b,x+16),rawOffset=u32(b,x+20);if(rawSize&&(rawOffset>b.length||rawSize>b.length-rawOffset))fail("section_out_of_bounds");sections.push({name,virtualSize,virtualAddress,rawSize,rawOffset})}
const map=(r)=>{for(const s of sections){if(r>=s.virtualAddress&&r<s.virtualAddress+Math.max(s.virtualSize,s.rawSize)){const d=r-s.virtualAddress;return d<s.rawSize?s.rawOffset+d:null}}return r<b.length?r:null};
const dir=(i)=>nd>i&&dd+(i+1)*8<=o+os?{rva:u32(b,dd+i*8),size:u32(b,dd+i*8+4)}:{rva:0,size:0};
const imp=dir(1),imports=[];if(imp.rva){let x=map(imp.rva);if(x!==null)for(let i=0;i<MAX_IMPORTS&&x+20<=b.length;i++,x+=20){const nr=u32(b,x+12);if(!nr&&!u32(b,x)&&!u32(b,x+16))break;const no=map(nr);if(no!==null){const v=ascii(b,no,b.length,260);if(v)imports.push(v)}}}
const cd=dir(14);let clr=null;if(cd.rva){const x=map(cd.rva);if(x!==null&&x+24<=b.length)clr={headerSize:u32(b,x),metadataRva:u32(b,x+8),metadataSize:u32(b,x+12),flags:u32(b,x+16)}}
const indicators=[],seen=new Set(),re=/[A-Za-z_][A-Za-z0-9_.+$:-]{3,100}/g;for(const z of b.toString("latin1").matchAll(re)){const v=z[0];if(seen.has(v))continue;seen.add(v);if(/Matrix|Rhino|Gem|Jali|Pave|Prong|Mesh|Weight|Command|Plugin|WPF|System|Microsoft|Newtonsoft|Grasshopper/i.test(v))indicators.push(v);if(indicators.length>=MAX_STRINGS)break}
const names={332:"x86",34404:"x64",43620:"ARM64",448:"ARM"};return {format:"PE",machine:names[m]||"unknown",machineCode:"0x"+m.toString(16),optionalHeader:is64?"PE32+":"PE32",architecture:is64?"64-bit":"32-bit",compileTimestamp:stamp?new Date(stamp*1000).toISOString():null,sections,imports,clr:clr?{present:true,...clr}:{present:false},runtimeHint:clr?"Common Language Runtime (.NET-compatible assembly)":"Native PE or managed metadata not detected",indicators}}
